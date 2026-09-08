import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { kycService } from "@/lib/services/kyc.service";
import { notificationService } from "@/lib/services/notification.service";

const KYC_ROLES: UserRole[] = ["BUYER", "MERCHANT", "MARKETER", "LENDER"];

export const KYC_DASHBOARD_PATHS: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/kyc",
  MERCHANT: "/dashboard/merchant/kyc",
  MARKETER: "/dashboard/marketer/kyc",
  LENDER: "/dashboard/lender/kyc",
};

export class VerificationReminderService {
  async isUserVerified(userId: string, role: UserRole): Promise<boolean> {
    if (!KYC_ROLES.includes(role)) return true;
    const status = await kycService.getVerificationStatus(userId, role);
    return Boolean(status.kycVerified || status.identityVerified);
  }

  async notifyIfUnverified(userId: string, role: UserRole) {
    if (!KYC_ROLES.includes(role)) return null;

    const verified = await this.isUserVerified(userId, role);
    if (verified) return null;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        read: false,
        title: "Complete your verification",
        createdAt: { gte: since },
      },
    });
    if (existing) return existing;

    const kycPath = KYC_DASHBOARD_PATHS[role] ?? "/dashboard";

    return notificationService.create({
      userId,
      title: "Complete your verification",
      body: "Your account is not verified yet. Complete Profile & KYC to unlock full platform access.",
      channel: "IN_APP",
      sendEmail: false,
      metadata: { type: "VERIFICATION_REQUIRED", href: kycPath },
    });
  }
}

export const verificationReminderService = new VerificationReminderService();
