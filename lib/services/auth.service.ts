import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { userRepository } from "@/lib/repositories/user.repository";
import { walletService } from "@/lib/services/wallet.service";
import { otpService } from "@/lib/services/otp.service";
import { notificationService } from "@/lib/services/notification.service";
import { auditService } from "@/lib/services/audit.service";
import { AppError } from "@/lib/errors";
import type { RegisterInput } from "@/lib/validations/auth";
import type { UserRole } from "@prisma/client";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";

const SUBSCRIPTION_LIMITS = {
  FREE: { propertyViews: 20, financingRequests: 1 },
  PREMIUM: { propertyViews: Infinity, financingRequests: Infinity },
};

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new AppError("Email already registered", 409);

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: input.role as UserRole,
        },
      });

      if (input.role === "TENANT") {
        await tx.tenant.create({
          data: { userId: created.id, fullName: input.fullName },
        });
      } else if (input.role === "LANDLORD") {
        await tx.landlord.create({
          data: { userId: created.id, fullName: input.fullName },
        });
      } else if (input.role === "LENDER") {
        await tx.lender.create({
          data: { userId: created.id, fullName: input.fullName },
        });
      } else if (input.role === "AGENT") {
        await tx.agentProfile.create({
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
      body: `Your verification code is: ${otp}`,
      channel: "EMAIL",
      sendEmail: true,
    });

    await auditService.log({
      userId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
    });

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

  getSubscriptionLimits(plan: keyof typeof SUBSCRIPTION_LIMITS) {
    return SUBSCRIPTION_LIMITS[plan];
  }
}

export const authService = new AuthService();
