import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { normalizeGhanaPhone } from "@/lib/integrations/sms/phone";

/** Frog / Wigal POST /api/v3/sms/send — https://frogdocs.wigal.com.gh/send_general.html */
export type WigalSmsResponse = {
  status?: string;
  message?: string;
  data?: unknown;
};

export type WigalSendRequestBody = {
  senderid: string;
  destinations: Array<{ destination: string; msgid: string }>;
  message: string;
  smstype: string;
};

function getApiKey(): string | undefined {
  return process.env.WIGAL_SMS_API_KEY?.trim() || process.env.SMS_API_KEY?.trim();
}

function getUsername(): string | undefined {
  return process.env.WIGAL_SMS_USERNAME?.trim();
}

function getSenderId(): string | undefined {
  return (
    process.env.WIGAL_SMS_SENDER_ID?.trim() ||
    process.env.SMS_SENDER_ID?.trim()
  );
}

/** Wigal samples use local Ghana numbers (e.g. 0222222222). */
export function formatPhoneForWigal(phone: string): string {
  const e164 = normalizeGhanaPhone(phone);
  if (e164.startsWith("+233")) {
    return `0${e164.slice(4)}`;
  }
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length >= 12) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("0")) return digits;
  return `0${digits}`;
}

export function isWigalConfigured() {
  return Boolean(getApiKey() && getUsername() && getSenderId());
}

function isSuccessResponse(data: WigalSmsResponse): boolean {
  const status = (data.status ?? "").trim().toUpperCase();
  if (status === "ACCEPTD" || status === "ACCEPTED") return true;
  const message = (data.message ?? "").toLowerCase();
  return message.includes("accepted for processing");
}

export async function sendWigalSms(params: {
  to: string;
  body: string;
  msgid?: string;
}): Promise<WigalSmsResponse> {
  const apiKey = getApiKey();
  const username = getUsername();
  const senderId = getSenderId();
  const baseUrl =
    process.env.WIGAL_SMS_API_URL?.trim() ||
    "https://frogapi.wigal.com.gh/api/v3/sms/send";

  if (!apiKey || !username || !senderId) {
    throw new Error(
      "Wigal SMS is not configured. Set WIGAL_SMS_API_KEY, WIGAL_SMS_USERNAME, and WIGAL_SMS_SENDER_ID."
    );
  }

  const destination = formatPhoneForWigal(params.to);
  const msgid = params.msgid?.trim() || `PFM-${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  const requestBody: WigalSendRequestBody = {
    senderid: senderId,
    destinations: [{ destination, msgid }],
    message: params.body,
    smstype: "text",
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "API-KEY": apiKey,
      USERNAME: username,
    },
    body: JSON.stringify(requestBody),
  });

  const text = await response.text();
  let data: WigalSmsResponse = {};

  if (text) {
    try {
      data = JSON.parse(text) as WigalSmsResponse;
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok || !isSuccessResponse(data)) {
    const message =
      data.message ??
      `Wigal SMS request failed (${response.status})`;
    logger.error("Wigal SMS delivery failed", {
      to: destination,
      msgid,
      httpStatus: response.status,
      status: data.status,
      message,
    });
    throw new Error(message);
  }

  logger.info("Wigal SMS queued", {
    to: destination,
    msgid,
    status: data.status,
  });

  return data;
}
