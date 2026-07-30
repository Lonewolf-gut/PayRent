import { logger } from "@/lib/logger";
import { normalizeGhanaPhone } from "@/lib/integrations/sms/phone";

export type ArkeselSmsResponse = {
  code?: string;
  status?: string;
  message?: string;
  balance?: number;
  main_balance?: number;
  data?: { id?: string; credits_used?: number };
};

function formatPhoneForArkesel(phone: string): string {
  return normalizeGhanaPhone(phone).replace(/^\+/, "");
}

function getApiKey(): string | undefined {
  return (
    process.env.ARKESEL_SMS_API_KEY?.trim() ||
    process.env.SMS_API_KEY?.trim()
  );
}

function getSenderId(): string | undefined {
  return (
    process.env.ARKESEL_SMS_SENDER_ID?.trim() ||
    process.env.SMS_SENDER_ID?.trim()
  );
}

function usesLegacyApi(): boolean {
  const version = (process.env.ARKESEL_SMS_API_VERSION || "").trim().toLowerCase();
  if (version === "legacy" || version === "v1") return true;
  if (version === "v2") return false;
  return Boolean(process.env.SMS_API_URL?.trim());
}

export function isArkeselConfigured() {
  return Boolean(getApiKey() && getSenderId());
}

function isSuccessResponse(data: ArkeselSmsResponse): boolean {
  if (data.status === "success") return true;
  if (data.code?.toLowerCase() === "ok") return true;
  return false;
}

async function sendArkeselLegacySms(params: {
  to: string;
  body: string;
}): Promise<ArkeselSmsResponse> {
  const apiKey = getApiKey();
  const senderId = getSenderId();
  const baseUrl =
    process.env.SMS_API_URL?.trim() ||
    process.env.ARKESEL_SMS_API_URL?.trim() ||
    "https://sms.arkesel.com/sms/api";

  if (!apiKey || !senderId) {
    throw new Error(
      "Arkesel SMS is not configured. Set SMS_API_KEY and ARKESEL_SMS_SENDER_ID."
    );
  }

  const url = new URL(baseUrl);
  url.searchParams.set("action", "send-sms");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("to", formatPhoneForArkesel(params.to));
  url.searchParams.set("from", senderId.slice(0, 11));
  url.searchParams.set("sms", params.body);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const text = await response.text();
  let data: ArkeselSmsResponse = {};

  if (text) {
    try {
      data = JSON.parse(text) as ArkeselSmsResponse;
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok || !isSuccessResponse(data)) {
    const message =
      data.message ??
      `Arkesel SMS request failed (${response.status})`;
    logger.error("Arkesel SMS delivery failed", {
      to: formatPhoneForArkesel(params.to),
      status: response.status,
      code: data.code,
      message,
    });
    throw new Error(message);
  }

  logger.info("Arkesel SMS sent (legacy API)", {
    to: formatPhoneForArkesel(params.to),
    messageId: data.data?.id,
    balance: data.balance,
  });

  return data;
}

async function sendArkeselV2Sms(params: {
  to: string;
  body: string;
}): Promise<ArkeselSmsResponse> {
  const apiKey = getApiKey();
  const senderId = getSenderId();
  const baseUrl =
    process.env.ARKESEL_SMS_V2_URL?.trim() ||
    "https://sms.arkesel.com/api/v2/sms/send";

  if (!apiKey || !senderId) {
    throw new Error(
      "Arkesel SMS is not configured. Set SMS_API_KEY and ARKESEL_SMS_SENDER_ID."
    );
  }

  const to = normalizeGhanaPhone(params.to);
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: senderId.slice(0, 11),
      message: params.body,
      recipients: [to],
    }),
  });

  const text = await response.text();
  let data: ArkeselSmsResponse = {};

  if (text) {
    try {
      data = JSON.parse(text) as ArkeselSmsResponse;
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok || !isSuccessResponse(data)) {
    const message =
      data.message ??
      `Arkesel SMS request failed (${response.status})`;
    logger.error("Arkesel SMS delivery failed", {
      to,
      status: response.status,
      message,
    });
    throw new Error(message);
  }

  logger.info("Arkesel SMS sent (v2 API)", {
    to,
    messageId: data.data?.id,
  });

  return data;
}

export async function sendArkeselSms(params: {
  to: string;
  body: string;
}): Promise<ArkeselSmsResponse> {
  if (usesLegacyApi()) {
    return sendArkeselLegacySms(params);
  }
  return sendArkeselV2Sms(params);
}
