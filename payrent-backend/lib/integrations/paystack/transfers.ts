import { paystackRequest, toPaystackAmount } from "@/lib/integrations/paystack/client";
import type { PaystackTransferData } from "@/lib/integrations/paystack/types";

function momoBankCode(bankName: string, bankCode?: string | null) {
  const source = `${bankName} ${bankCode ?? ""}`.toLowerCase();
  if (source.includes("vodafone") || source.includes("vod")) return "VOD";
  if (source.includes("airtel") || source.includes("tigo") || source.includes("at")) return "TIG";
  return "MTN";
}

export async function createPaystackTransferRecipient(params: {
  name: string;
  accountNumber: string;
  accountType: "MOMO" | "BANK";
  bankName: string;
  bankCode?: string | null;
}) {
  const type = params.accountType === "MOMO" ? "mobile_money" : "ghipss";

  const payload =
    type === "mobile_money"
      ? {
          type,
          name: params.name,
          account_number: params.accountNumber,
          bank_code: momoBankCode(params.bankName, params.bankCode),
          currency: "GHS",
        }
      : {
          type,
          name: params.name,
          account_number: params.accountNumber,
          bank_code: params.bankCode ?? params.bankName,
          currency: "GHS",
        };

  const response = await paystackRequest<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.data.recipient_code;
}

export async function initiatePaystackTransfer(params: {
  amountGhs: number;
  recipientCode: string;
  reason: string;
  reference: string;
}) {
  const response = await paystackRequest<PaystackTransferData>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: toPaystackAmount(params.amountGhs),
      recipient: params.recipientCode,
      reason: params.reason,
      reference: params.reference,
      currency: "GHS",
    }),
  });

  const status = response.data.status?.toLowerCase();
  return {
    reference: response.data.reference,
    transferCode: response.data.transfer_code,
    status:
      status === "success" || status === "pending"
        ? ("SUCCESSFUL" as const)
        : status === "failed"
          ? ("FAILED" as const)
          : ("PENDING" as const),
    message: response.message,
  };
}
