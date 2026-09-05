import { getHubtelPaymentsConfig } from "@/lib/integrations/hubtel/config";
import { hubtelRequest, isHubtelSuccess } from "@/lib/integrations/hubtel/client";
import { detectHubtelChannel, toHubtelMsisdn } from "@/lib/integrations/hubtel/channels";
import type { HubtelTransactionData } from "@/lib/integrations/hubtel/types";

export async function sendHubtelMobileMoney(params: {
  amount: number;
  phone: string;
  recipientName: string;
  clientReference: string;
  description: string;
  channel?: string;
  callbackUrl?: string;
}) {
  const config = getHubtelPaymentsConfig();
  if (!config) {
    throw new Error("Hubtel payments are not configured.");
  }

  const url = `${config.sendBaseUrl}/api/merchants/${config.merchantAccountNumber}/send/mobilemoney`;

  const response = await hubtelRequest<HubtelTransactionData>({
    url,
    config,
    body: {
      RecipientName: params.recipientName,
      RecipientMsisdn: toHubtelMsisdn(params.phone),
      CustomerEmail: "noreply@rentforme.com",
      Channel: params.channel ?? detectHubtelChannel(params.phone),
      Amount: params.amount,
      PrimaryCallbackUrl: params.callbackUrl ?? config.callbackUrl,
      Description: params.description,
      ClientReference: params.clientReference,
    },
  });

  return {
    responseCode: response.ResponseCode,
    message: response.Message,
    data: response.Data,
    status: isHubtelSuccess(response.ResponseCode) ? "PENDING" : "FAILED",
  } as const;
}

export async function sendHubtelBankTransfer(params: {
  amount: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string | null;
  clientReference: string;
  description: string;
  callbackUrl?: string;
}) {
  const config = getHubtelPaymentsConfig();
  if (!config) {
    throw new Error("Hubtel payments are not configured.");
  }

  const url = `${config.sendBaseUrl}/api/merchants/${config.merchantAccountNumber}/send/bank/gh`;

  const response = await hubtelRequest<HubtelTransactionData>({
    url,
    config,
    body: {
      BankName: params.bankName,
      BankBranch: params.bankName,
      BankAccountNumber: params.accountNumber,
      BankAccountName: params.accountName,
      BankCode: params.bankCode ?? undefined,
      Amount: params.amount,
      PrimaryCallbackUrl: params.callbackUrl ?? config.callbackUrl,
      Description: params.description,
      ClientReference: params.clientReference,
    },
  });

  return {
    responseCode: response.ResponseCode,
    message: response.Message,
    data: response.Data,
    status: isHubtelSuccess(response.ResponseCode) ? "PENDING" : "FAILED",
  } as const;
}
