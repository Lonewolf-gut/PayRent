import { getPaystackConfig } from "@/lib/integrations/paystack/config";
import {
  fromPaystackAmount,
  paystackRequest,
  toPaystackAmount,
  type PaystackApiResponse,
} from "@/lib/integrations/paystack/client";
import type { PaystackTransactionData } from "@/lib/integrations/paystack/types";

export async function initializePaystackTransaction(params: {
  email: string;
  amountGhs: number;
  reference: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const config = getPaystackConfig();

  const response = await paystackRequest<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: toPaystackAmount(params.amountGhs),
      reference: params.reference,
      currency: config.currency,
      callback_url: `${config.returnUrl}?reference=${encodeURIComponent(params.reference)}`,
      metadata: {
        custom_fields: [],
        ...(params.metadata ?? {}),
      },
      channels: ["card", "mobile_money", "bank"],
    }),
  });

  return {
    authorizationUrl: response.data.authorization_url,
    accessCode: response.data.access_code,
    reference: response.data.reference,
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await paystackRequest<PaystackTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" }
  );

  const status = response.data.status?.toLowerCase();
  const mappedStatus =
    status === "success"
      ? ("SUCCESSFUL" as const)
      : status === "failed" || status === "abandoned"
        ? ("FAILED" as const)
        : ("PENDING" as const);

  return {
    status: mappedStatus,
    message: response.data.gateway_response,
    data: response.data,
    amountGhs: fromPaystackAmount(response.data.amount),
  };
}

export function parsePaystackChargeSuccess(payload: PaystackApiResponse<PaystackTransactionData>) {
  const status = payload.data?.status?.toLowerCase();
  return {
    isSuccess: status === "success",
    reference: payload.data?.reference,
    amountGhs: payload.data?.amount != null ? fromPaystackAmount(payload.data.amount) : undefined,
    transactionId: payload.data?.id ? String(payload.data.id) : undefined,
    channel: payload.data?.channel,
  };
}
