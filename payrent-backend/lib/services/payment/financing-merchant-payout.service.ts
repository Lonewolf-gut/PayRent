import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import {
  disburseToBankAccount,
  disburseToMobileMoney,
  isPayoutConfigured,
} from "@/lib/services/payment/payout.service";
import { isBankPartnerApiConfigured } from "@/lib/services/payment/bank-partner-auth";
import { getPaymentProvider } from "@/lib/services/payment/provider";
import { isDemoMode } from "@/lib/config/demo";

export type MerchantPayoutTarget = {
  id: string;
  accountType: string;
  bankName: string;
  bankCode?: string | null;
  accountNumber: string;
  accountName: string;
};

export function getFinancingPayoutProviderLabel() {
  const provider = getPaymentProvider();
  if (provider === "demo" || isDemoMode()) return "Demo payment provider";
  if (isBankPartnerApiConfigured()) return "Partner bank";
  if (provider === "paystack") return "Paystack";
  if (provider === "hubtel") return "Hubtel";
  if (provider === "momo") return "Mobile Money";
  return "Payment provider";
}

export async function payMerchantForFinancing(params: {
  amount: number;
  account: MerchantPayoutTarget;
  reference: string;
  description: string;
}) {
  if (params.amount <= 0) {
    throw new AppError("Payout amount must be positive", 400);
  }

  if (process.env.NODE_ENV === "development" || getPaymentProvider() === "demo" || isDemoMode()) {
    logger.info("Financing merchant payout simulated", {
      reference: params.reference,
      amount: params.amount,
      accountType: params.account.accountType,
    });
    return {
      provider: "sandbox" as const,
      reference: params.reference,
      status: "SUCCESSFUL" as const,
    };
  }

  if (!isPayoutConfigured()) {
    throw new AppError(
      "Payment provider is not configured for merchant payouts. Contact platform support.",
      503,
      "PAYOUT_NOT_CONFIGURED"
    );
  }

  if (params.account.accountType === "MOMO") {
    return disburseToMobileMoney({
      amount: params.amount,
      phone: params.account.accountNumber,
      recipientName: params.account.accountName,
      bankName: params.account.bankName,
      bankCode: params.account.bankCode,
      description: params.description,
      reference: params.reference,
    });
  }

  return disburseToBankAccount({
    amount: params.amount,
    accountNumber: params.account.accountNumber,
    accountName: params.account.accountName,
    bankName: params.account.bankName,
    bankCode: params.account.bankCode,
    description: params.description,
    reference: params.reference,
  });
}
