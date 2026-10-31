import { logger } from "@/lib/logger";
import {
  getReddeApiKey,
  getReddeAppId,
  getReddeCashoutUrl,
  getReddeMerchantNickname,
  getReddeReceiveUrl,
  isReddeConfigured,
} from "@/lib/integrations/redde/config";
import type { ReddePaymentOption } from "@/lib/integrations/redde/network";

export type ReddeReceivePayload = {
  amount: number;
  clientReference: string;
  clientTransId: string;
  description: string;
  paymentOption: ReddePaymentOption | string;
  walletNumber: string;
  voucherCode?: string;
};

export type ReddeApiResponse = {
  ok: boolean;
  statusCode: number;
  body: unknown;
  message?: string;
};

async function postRedde(url: string, json: Record<string, unknown>): Promise<ReddeApiResponse> {
  const apiKey = getReddeApiKey();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ApiKey: apiKey,
      apikey: apiKey,
    },
    body: JSON.stringify(json),
  });

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  const message =
    typeof body === "object" && body !== null && "message" in body
      ? String((body as { message?: unknown }).message)
      : undefined;

  return {
    ok: response.ok,
    statusCode: response.status,
    body,
    message,
  };
}

export async function reddeReceiveMoney(input: ReddeReceivePayload): Promise<ReddeApiResponse> {
  if (!isReddeConfigured()) {
    throw new Error("Redde is not configured. Set REDDE_APP_ID and REDDE_API_KEY.");
  }

  const payload = {
    amount: input.amount,
    appid: getReddeAppId(),
    clientreference: input.clientReference,
    clienttransid: input.clientTransId,
    description: input.description,
    nickname: getReddeMerchantNickname(),
    paymentoption: input.paymentOption,
    vouchercode: input.voucherCode ?? "",
    walletnumber: input.walletNumber,
  };

  logger.info("Redde receive initiated", {
    clientReference: input.clientReference,
    paymentOption: input.paymentOption,
    amount: input.amount,
  });

  return postRedde(getReddeReceiveUrl(), payload);
}

export async function reddeSendMoney(input: ReddeReceivePayload): Promise<ReddeApiResponse> {
  if (!isReddeConfigured()) {
    throw new Error("Redde is not configured. Set REDDE_APP_ID and REDDE_API_KEY.");
  }

  const payload = {
    amount: input.amount,
    appid: getReddeAppId(),
    clientreference: input.clientReference,
    clienttransid: input.clientTransId,
    description: input.description,
    nickname: getReddeMerchantNickname(),
    paymentoption: input.paymentOption,
    vouchercode: input.voucherCode ?? "",
    walletnumber: input.walletNumber,
  };

  logger.info("Redde cashout initiated", {
    clientReference: input.clientReference,
    paymentOption: input.paymentOption,
    amount: input.amount,
  });

  return postRedde(getReddeCashoutUrl(), payload);
}

export function parseReddeCallback(body: Record<string, unknown>) {
  const clientReference = String(
    body.clientreference ?? body.clientReference ?? body.ClientReference ?? ""
  ).trim();
  const clientTransId = String(
    body.clienttransid ?? body.clientTransId ?? body.ClientTransId ?? ""
  ).trim();
  const transactionId = String(
    body.transactionid ?? body.transactionId ?? body.TransactionId ?? body.transid ?? ""
  ).trim();
  const rawStatus = String(body.status ?? body.Status ?? body.response ?? "").toUpperCase();
  const amount = Number(body.amount ?? body.Amount ?? 0);

  const success =
    rawStatus.includes("SUCCESS") ||
    rawStatus === "PAID" ||
    rawStatus === "OK" ||
    rawStatus === "1" ||
    rawStatus === "TRUE";

  return {
    clientReference,
    clientTransId,
    transactionId,
    amount,
    success,
    rawStatus,
  };
}
