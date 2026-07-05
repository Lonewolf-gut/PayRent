import bcrypt from "bcryptjs";
import { prisma, runTransaction } from "@/lib/db/prisma";
import { userRepository } from "@/lib/repositories/user.repository";
import { walletService } from "@/lib/services/wallet.service";
import { otpService } from "@/lib/services/otp.service";
import { notificationService } from "@/lib/services/notification.service";
import {
  formatRoleLabel,
  getUserDisplayName,
  notifyAllAdminsInAppAndEmail,
  notifyUserInAppAndEmail,
} from "@/lib/services/verification-notifications";
import { auditService } from "@/lib/services/audit.service";
import { AppError } from "@/lib/errors";
import { getTrialEndDate } from "@/lib/subscription/access";
import { roleRequiresSubscription } from "@/lib/subscription/roles";
import type { RegisterInput } from "@/lib/validations/auth";
import type { UserRole } from "@prisma/client";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { getProfileDisplayName } from "@/lib/utils/display-name";
import { SUPPORT_EMAIL, PLATFORM_NAME } from "@/constants/platform";
import { sendEmail, buildEmailTemplate } from "@/lib/services/email.service";

const SUBSCRIPTION_LIMITS = {
  FREE: { propertyViews: 3, financingRequests: 1 },
  PRO: { propertyViews: 20, financingRequests: 5 },
  MAX: { propertyViews: Infinity, financingRequests: Infinity },
  PREMIUM: { propertyViews: Infinity, financingRequests: Infinity },
};

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(
        "This email is already registered. Sign in instead or use a different email address.",
        409,
        "EMAIL_ALREADY_REGISTERED"
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await runTransaction(async (db) => {
      const created = await db.user.create({
        data: {
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: input.role as UserRole,
          ...(roleRequiresSubscription(input.role as UserRole)
            ? { trialEndsAt: getTrialEndDate() }
            : {}),
        },
      });

      if (input.role === "TENANT") {
        await db.tenant.create({
          data: {
            userId: created.id,
            fullName: input.fullName,
            entityType: input.entityType ?? "INDIVIDUAL",
            ...(input.entityType === "COMPANY" && input.companyName
              ? { companyName: input.companyName }
              : {}),
          },
        });
      } else if (input.role === "LANDLORD") {
        await db.landlord.create({
          data: {
            userId: created.id,
            fullName: input.fullName,
            entityType: input.entityType ?? "INDIVIDUAL",
            ...(input.entityType === "COMPANY" && input.companyName
              ? { companyName: input.companyName }
              : {}),
          },
        });
      } else if (input.role === "LENDER") {
        await db.lender.create({
          data: { userId: created.id, fullName: input.fullName },
        });
      } else if (input.role === "AGENT") {
        await db.agentProfile.create({
          data: { userId: created.id, fullName: input.fullName },
        });
      }

      return created;
    });

    const walletType =
      input.role === "TENANT"
        ? "TENANT"
        : input.role === "LANDLORD"
          ? "LANDLORD"
          : input.role === "AGENT"
            ? "AGENT"
            : "LENDER";

    await walletService.getOrCreateWallet(user.id, walletType);

    await prisma.subscription.create({
      data: { userId: user.id, plan: "FREE", status: "ACTIVE" },
    });

    const otp = await otpService.create(user.id, "EMAIL_VERIFY");
    await notificationService.create({
      userId: user.id,
      title: "Verify your email",
      body: `Your verification code is: ${otp}. It expires in 15 minutes.`,
      channel: "IN_APP",
      sendEmail: false,
    });

    const emailResult = await notificationService.deliverEmail(
      user.id,
      "Verify your email",
      `Your verification code is: ${otp}\n\nIt expires in 15 minutes. Enter this code on the verify email page to unlock your dashboard.`
    );

    if (emailResult?.previewUrl) {
      const { logger } = await import("@/lib/logger");
      logger.info("Open this link to view the verification email", {
        previewUrl: emailResult.previewUrl,
        email: user.email,
      });
    }

    const displayName =
      getProfileDisplayName({
        entityType: input.entityType ?? "INDIVIDUAL",
        fullName: input.fullName,
        companyName: input.companyName ?? null,
      }) ?? input.fullName;

    const roleLabel = formatRoleLabel(input.role);
    const welcomeBody = [
      `Hi ${displayName}, welcome to ${PLATFORM_NAME}!`,
      "",
      `Your ${roleLabel} account has been created successfully. We're glad to have you on Ghana's trusted rental finance marketplace.`,
      "",
      "Here's what to do next:",
      "1. Verify your email using the code we sent in a separate email",
      "2. Complete your profile and KYC verification",
      "3. Explore your dashboard and start using PayForMe",
      "",
      `If you did not create this account, please contact ${SUPPORT_EMAIL} immediately.`,
    ].join("\n");

    await notificationService.create({
      userId: user.id,
      title: "Welcome to PayForMe",
      body: welcomeBody,
      channel: "IN_APP",
      sendEmail: false,
    });

    const welcomeEmailResult = await sendEmail({
      to: user.email,
      subject: `[PayForMe] Welcome to PayForMe — your account is ready`,
      html: buildEmailTemplate("Welcome to PayForMe", welcomeBody),
      text: welcomeBody,
    });

    if (welcomeEmailResult?.previewUrl) {
      const { logger } = await import("@/lib/logger");
      logger.info("Open this link to view the welcome email", {
        previewUrl: welcomeEmailResult.previewUrl,
        email: user.email,
      });
    }

    await notifyAllAdminsInAppAndEmail(
      "New account registered",
      `${displayName} (${formatRoleLabel(input.role)}) registered with ${user.email}. Account is pending email verification.`
    );

    await auditService.log({
      userId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
    });

    const { verificationReminderService } = await import(
      "@/lib/services/verification-reminder.service"
    );
    await verificationReminderService.notifyIfUnverified(user.id, user.role);

    return { userId: user.id, email: user.email, role: user.role };
  }

  async verifyEmail(userId: string, code: string) {
    await otpService.verify(userId, code, "EMAIL_VERIFY");
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
    await prisma.verification.create({
      data: {
        userId,
        type: "EMAIL",
        status: "APPROVED",
      },
    });

    const displayName = await getUserDisplayName(userId);
    await notifyUserInAppAndEmail(
      userId,
      "Email verified",
      `Hi ${displayName}, your email is verified. You can now access all dashboard features.`
    );

    return true;
  }

  async verifyPhone(userId: string, code: string) {
    await otpService.verify(userId, code, "PHONE_VERIFY");
    await prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: new Date() },
    });
    return true;
  }

  async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }

  getSubscriptionLimits(plan: keyof typeof SUBSCRIPTION_LIMITS | string) {
    if (plan === "PRO") return SUBSCRIPTION_LIMITS.PRO;
    if (plan === "MAX" || plan === "PREMIUM") return SUBSCRIPTION_LIMITS.MAX;
    return SUBSCRIPTION_LIMITS.FREE;
  }
}

export const authService = new AuthService();
