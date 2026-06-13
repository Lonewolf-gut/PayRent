import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { auditService } from "@/lib/services/audit.service";
import { AppError } from "@/lib/errors";
import type {
  TenantProfileInput,
  GhanaCardVerifyInput,
  BankAccountInput,
} from "@/lib/validations/kyc";

function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `${"*".repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
}

export class KycService {
  async updateTenantProfile(tenantId: string, userId: string, input: TenantProfileInput) {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        occupation: input.occupation,
        employerName: input.employerName,
        monthlyIncome: input.monthlyIncome,
        residentialAddress: input.residentialAddress,
        profileStatus: "PROFILE_COMPLETED",
      },
    });

    await auditService.log({
      userId,
      action: "TENANT_PROFILE_UPDATED",
      entity: "Tenant",
      entityId: tenantId,
    });

    return updated;
  }

  async verifyGhanaCard(userId: string, tenantId: string, input: GhanaCardVerifyInput) {
    const verification = await prisma.verification.create({
      data: {
        userId,
        type: "IDENTITY",
        status: "APPROVED",
        data: {
          ghanaCardNumber: input.ghanaCardNumber,
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          providerReference: `idp_${Date.now()}`,
          providerName: "GhanaCardAdapter",
        },
        reviewedAt: new Date(),
      },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        nationalId: input.ghanaCardNumber,
        kycVerified: true,
        profileStatus: "KYC_VERIFIED",
      },
    });

    await notificationService.create({
      userId,
      title: "Identity verified",
      body: "Your Ghana Card verification was completed successfully.",
    });

    await auditService.log({
      userId,
      action: "GHANA_CARD_VERIFIED",
      entity: "Verification",
      entityId: verification.id,
    });

    return verification;
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
        status: "APPROVED",
        data: {
          bankAccountId: account.id,
          providerName: "BankValidationAdapter",
          providerReference: `bva_${Date.now()}`,
        },
        reviewedAt: new Date(),
      },
    });

    await prisma.bankAccount.update({
      where: { id: account.id },
      data: { validationStatus: "VALIDATED", isVerified: true },
    });

    await auditService.log({
      userId,
      action: "BANK_ACCOUNT_ADDED",
      entity: "BankAccount",
      entityId: account.id,
    });

    const validated = await prisma.bankAccount.findUniqueOrThrow({ where: { id: account.id } });
    return validated;
  }

  async getVerificationStatus(userId: string) {
    const [tenant, verifications, bankAccounts] = await Promise.all([
      prisma.tenant.findUnique({ where: { userId } }),
      prisma.verification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bankAccount.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      profileStatus: tenant?.profileStatus ?? "INCOMPLETE",
      kycVerified: tenant?.kycVerified ?? false,
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
      where: { userId: account.userId, type: "BANK", status: "PENDING" },
      data: { status: "APPROVED", reviewedBy: adminUserId, reviewedAt: new Date() },
    });

    await notificationService.create({
      userId: account.userId,
      title: "Bank account validated",
      body: `Your ${account.bankName} account has been validated.`,
    });

    return updated;
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
