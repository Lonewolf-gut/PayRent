import type { BankAccount } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";

export function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `****${accountNumber.slice(-4)}`;
}

export async function getMerchantDefaultPayoutAccount(merchantUserId: string) {
  return prisma.bankAccount.findFirst({
    where: { userId: merchantUserId, isVerified: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function requireMerchantDefaultPayoutAccount(merchantUserId: string) {
  const account = await getMerchantDefaultPayoutAccount(merchantUserId);
  if (!account) {
    throw new AppError(
      "This merchant has no verified payout bank or MoMo account. They must add one before you can finance this listing.",
      400,
      "MERCHANT_PAYOUT_ACCOUNT_REQUIRED"
    );
  }
  return account;
}

export function serializeMerchantPayoutAccountForDisplay(account: BankAccount) {
  return {
    id: account.id,
    accountType: account.accountType,
    bankName: account.bankName,
    bankCode: account.bankCode,
    accountName: account.accountName,
    accountNumberMasked:
      account.accountNumberMasked ?? maskAccountNumber(account.accountNumber),
    isDefault: account.isDefault,
  };
}

export type MerchantPayoutAccountDisplay = ReturnType<
  typeof serializeMerchantPayoutAccountForDisplay
>;
