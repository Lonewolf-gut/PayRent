import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { auditService } from "@/lib/services/audit.service";
import { AppError } from "@/lib/errors";
import type { UserRole } from "@prisma/client";
import type {
  TenantProfileInput,
  GhanaCardVerifyInput,
  BankAccountInput,
} from "@/lib/validations/kyc";

function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `${"*".repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
}

async function notifyAdmins(title: string, body: string) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "CEO"] } },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin: { id: string }) =>
      notificationService.create({
        userId: admin.id,
        title,
        body,
        channel: "IN_APP",
      })
    )
  );
}

export class KycService {
  async updateProfile(userId: string, role: UserRole, input: TenantProfileInput) {
    if (role === "TENANT") {
      const updated = await prisma.tenant.update({
        where: { userId },
        data: {
          profileStatus: "PROFILE_COMPLETED",
          ...(input.dateOfBirth ? { dateOfBirth: new Date(input.dateOfBirth) } : {}),
          occupation: input.occupation,
          employerName: input.employerName,
          monthlyIncome: input.monthlyIncome,
          residentialAddress: input.residentialAddress,
        },
      });
      await auditService.log({
        userId,
        action: "TENANT_PROFILE_UPDATED",
        entity: "Tenant",
        entityId: updated.id,
      });
      return updated;
    }

    if (role === "LANDLORD") {
      const updated = await prisma.landlord.update({
        where: { userId },
        data: { profileStatus: "PROFILE_COMPLETED" },
      });
      await auditService.log({
        userId,
        action: "LANDLORD_PROFILE_UPDATED",
        entity: "Landlord",
        entityId: updated.id,
      });
      return updated;
    }

    if (role === "LENDER") {
      const updated = await prisma.lender.update({
        where: { userId },
        data: { profileStatus: "PROFILE_COMPLETED" },
      });
      await auditService.log({
        userId,
        action: "LENDER_PROFILE_UPDATED",
        entity: "Lender",
        entityId: updated.id,
      });
      return updated;
    }

    if (role === "AGENT") {
      const updated = await prisma.agentProfile.update({
        where: { userId },
        data: {
          profileStatus: "PROFILE_COMPLETED",
          officeAddress: input.residentialAddress,
        },
      });
      await auditService.log({
        userId,
        action: "AGENT_PROFILE_UPDATED",
        entity: "AgentProfile",
        entityId: updated.id,
      });
      return updated;
    }

    throw new AppError("Unsupported role for profile update");
  }

  async submitGhanaCard(userId: string, role: UserRole, input: GhanaCardVerifyInput) {
    const existingPending = await prisma.verification.findFirst({
      where: { userId, type: "IDENTITY", status: "PENDING" },
    });
    if (existingPending) {
      throw new AppError("Identity verification already pending review");
    }

    const verification = await prisma.verification.create({
      data: {
        userId,
        type: "IDENTITY",
        status: "PENDING",
        data: {
          ghanaCardNumber: input.ghanaCardNumber,
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          role,
        },
      },
    });

    await this.setProfilePendingIdentity(userId, role, input.ghanaCardNumber);

    await notificationService.create({
      userId,
      title: "Identity submitted for review",
      body: "Your Ghana Card details have been submitted and are pending admin approval.",
      channel: "EMAIL",
      sendEmail: true,
    });

    await notifyAdmins(
      "New identity verification pending",
      `${input.fullName} (${role}) submitted Ghana Card details for review.`
    );

    await auditService.log({
      userId,
      action: "GHANA_CARD_SUBMITTED",
      entity: "Verification",
      entityId: verification.id,
    });

    return verification;
  }

  private async setProfilePendingIdentity(
    userId: string,
    role: UserRole,
    nationalId: string
  ) {
    const status = "KYC_PENDING";

    if (role === "TENANT") {
      await prisma.tenant.update({
        where: { userId },
        data: { nationalId, profileStatus: status },
      });
    } else if (role === "LANDLORD") {
      await prisma.landlord.update({
        where: { userId },
        data: { nationalId, profileStatus: status },
      });
    } else if (role === "LENDER") {
      await prisma.lender.update({
        where: { userId },
        data: { nationalId, profileStatus: status },
      });
    } else if (role === "AGENT") {
      await prisma.agentProfile.update({
        where: { userId },
        data: { profileStatus: status },
      });
    }
  }

  async addBankAccount(userId: string, input: BankAccountInput) {
    if (input.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const account = await prisma.bankAccount.create({
      data: {
        userId,
        accountType: input.accountType,
        bankCode: input.bankCode,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        accountNumberMasked: maskAccountNumber(input.accountNumber),
        accountName: input.accountName,
        isDefault: input.isDefault,
        validationStatus: "PENDING",
      },
    });

    await prisma.verification.create({
      data: {
        userId,
        type: "BANK",
        status: "PENDING",
        data: {
          bankAccountId: account.id,
          bankName: input.bankName,
          accountName: input.accountName,
        },
      },
    });

    await notifyAdmins(
      "New bank account pending validation",
      `${input.accountName} submitted bank/MoMo details for review.`
    );

    await auditService.log({
      userId,
      action: "BANK_ACCOUNT_ADDED",
      entity: "BankAccount",
      entityId: account.id,
    });

    return prisma.bankAccount.findUniqueOrThrow({ where: { id: account.id } });
  }

  async getVerificationStatus(userId: string, role: UserRole) {
    const [tenant, landlord, lender, agent, verifications, bankAccounts] =
      await Promise.all([
        prisma.tenant.findUnique({ where: { userId } }),
        prisma.landlord.findUnique({ where: { userId } }),
        prisma.lender.findUnique({ where: { userId } }),
        prisma.agentProfile.findUnique({ where: { userId } }),
        prisma.verification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.bankAccount.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const profile =
      role === "TENANT"
        ? tenant
        : role === "LANDLORD"
          ? landlord
          : role === "LENDER"
            ? lender
            : agent;

    const identityVerified =
      role === "TENANT"
        ? (tenant?.kycVerified ?? false)
        : role === "LENDER"
          ? (lender?.identityVerified ?? false) || (lender?.kycVerified ?? false)
          : role === "LANDLORD"
            ? (landlord?.identityVerified ?? false)
            : profile?.profileStatus === "KYC_VERIFIED";

    return {
      profileStatus: profile?.profileStatus ?? "INCOMPLETE",
      kycVerified: identityVerified,
      identityVerified,
      verifications,
      bankAccounts: bankAccounts.map((a) => ({
        ...a,
        accountNumber: a.accountNumberMasked ?? maskAccountNumber(a.accountNumber),
      })),
    };
  }

  async validateBankAccount(bankAccountId: string, adminUserId?: string) {
    const account = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });
    if (!account) throw new AppError("Bank account not found", 404);

    const updated = await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        validationStatus: "VALIDATED",
        isVerified: true,
      },
    });

    await prisma.verification.updateMany({
      where: {
        userId: account.userId,
        type: "BANK",
        status: "PENDING",
      },
      data: { status: "APPROVED", reviewedBy: adminUserId, reviewedAt: new Date() },
    });

    await notificationService.create({
      userId: account.userId,
      title: "Bank account validated",
      body: `Your ${account.bankName} account has been validated.`,
      channel: "EMAIL",
      sendEmail: true,
    });

    return updated;
  }

  async approveIdentityVerification(verificationId: string, adminUserId: string) {
    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!verification || verification.type !== "IDENTITY") {
      throw new AppError("Identity verification not found", 404);
    }
    if (verification.status !== "PENDING") {
      throw new AppError("Verification is not pending");
    }

    const data = verification.data as {
      ghanaCardNumber?: string;
      fullName?: string;
      role?: UserRole;
    };
    const role = data.role ?? verification.user.role;
    const nationalId = data.ghanaCardNumber;

    await prisma.verification.update({
      where: { id: verificationId },
      data: { status: "APPROVED", reviewedBy: adminUserId, reviewedAt: new Date() },
    });

    await this.markIdentityApproved(verification.userId, role, nationalId);

    await notificationService.create({
      userId: verification.userId,
      title: "Identity verified",
      body: "Your Ghana Card verification has been approved. You can now access verified features.",
      channel: "EMAIL",
      sendEmail: true,
    });

    await auditService.log({
      userId: adminUserId,
      action: "IDENTITY_APPROVED",
      entity: "Verification",
      entityId: verificationId,
    });

    return verification;
  }

  private async markIdentityApproved(
    userId: string,
    role: UserRole,
    nationalId?: string
  ) {
    if (role === "TENANT") {
      await prisma.tenant.update({
        where: { userId },
        data: {
          nationalId,
          kycVerified: true,
          profileStatus: "KYC_VERIFIED",
        },
      });
    } else if (role === "LANDLORD") {
      await prisma.landlord.update({
        where: { userId },
        data: {
          nationalId,
          identityVerified: true,
          profileStatus: "KYC_VERIFIED",
        },
      });
    } else if (role === "LENDER") {
      await prisma.lender.update({
        where: { userId },
        data: {
          nationalId,
          kycVerified: true,
          identityVerified: true,
          profileStatus: "KYC_VERIFIED",
        },
      });
    } else if (role === "AGENT") {
      await prisma.agentProfile.update({
        where: { userId },
        data: { profileStatus: "KYC_VERIFIED" },
      });
    }
  }

  async getPendingKycReviews() {
    return prisma.verification.findMany({
      where: { status: "PENDING", type: { in: ["KYC", "IDENTITY", "BANK"] } },
      include: { user: { select: { email: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const kycService = new KycService();
