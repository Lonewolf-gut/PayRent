import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { toHubtelMsisdn } from "@/lib/integrations/hubtel/channels";

export async function getVerifiedUserBankAccount(userId: string, bankAccountId: string) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, userId, isVerified: true },
  });

  if (!account) {
    throw new AppError("Select a verified bank or MoMo account from Settings", 400);
  }

  return account;
}

export function getDepositPhoneFromAccount(account: {
  accountType: string;
  accountNumber: string;
}, userPhone?: string | null) {
  if (account.accountType === "MOMO") {
    return account.accountNumber;
  }
  return userPhone ?? account.accountNumber;
}

export function getHubtelPayeePhone(account: { accountType: string; accountNumber: string }, userPhone?: string | null) {
  const phone = getDepositPhoneFromAccount(account, userPhone);
  return toHubtelMsisdn(phone);
}
