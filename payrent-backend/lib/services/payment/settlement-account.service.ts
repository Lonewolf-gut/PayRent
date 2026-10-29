import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";

export class SettlementAccountService {
  async getDefaultAccount() {
    return prisma.platformSettlementAccount.findFirst({
      where: { isActive: true, isDefault: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async listAccounts() {
    return prisma.platformSettlementAccount.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { bankName: "asc" }],
    });
  }

  async upsertDefaultAccount(input: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    partnerBankId?: string;
  }) {
    const existing = await this.getDefaultAccount();

    if (existing) {
      return prisma.platformSettlementAccount.update({
        where: { id: existing.id },
        data: {
          bankName: input.bankName,
          bankCode: input.bankCode,
          accountNumber: input.accountNumber,
          accountName: input.accountName,
          partnerBankId: input.partnerBankId ?? null,
          isDefault: true,
          isActive: true,
        },
      });
    }

    return prisma.platformSettlementAccount.create({
      data: {
        bankName: input.bankName,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        partnerBankId: input.partnerBankId ?? null,
        isDefault: true,
        isActive: true,
      },
    });
  }

  async requireDefaultAccount() {
    const account = await this.getDefaultAccount();
    if (!account) {
      throw new AppError(
        "Platform collection account is not configured",
        503,
        "SETTLEMENT_ACCOUNT_MISSING"
      );
    }
    return account;
  }
}

export const settlementAccountService = new SettlementAccountService();
