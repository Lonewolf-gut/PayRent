import { logger } from "@/lib/logger";
import { normalizeGhanaPhone } from "@/lib/integrations/sms/phone";

export type HubtelSmsResponse = {
  MessageId?: string;
  Status?: number | string;
  StatusDescription?: string;
  Rate?: number;
  NetworkId?: string;
};

export function isHubtelConfigured() {
  return Boolean(
    process.env.HUBTEL_SMS_CLIENT_ID?.trim() &&
      process.env.HUBTEL_SMS_CLIENT_SECRET?.trim() &&
      process.env.HUBTEL_SMS_SENDER_ID?.trim()
  );
}

export async function sendHubtelSms(params: {
  to: string;
  body: string;
}): Promise<HubtelSmsResponse> {
  const clientId = process.env.HUBTEL_SMS_CLIENT_ID?.trim();
  const clientSecret = process.env.HUBTEL_SMS_CLIENT_SECRET?.trim();
  const senderId = process.env.HUBTEL_SMS_SENDER_ID?.trim();
  const baseUrl =
    process.env.HUBTEL_SMS_BASE_URL?.trim() ||
    "https://smsc.hubtel.com/v1/messages/send";

  if (!clientId || !clientSecret || !senderId) {
    throw new Error(
      "Hubtel SMS is not configured. Set HUBTEL_SMS_CLIENT_ID, HUBTEL_SMS_CLIENT_SECRET, and HUBTEL_SMS_SENDER_ID."
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const to = normalizeGhanaPhone(params.to);

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      From: senderId,
      To: to,
      Content: params.body,
    }),
  });

  const text = await response.text();
  let data: HubtelSmsResponse & { message?: string } = {};

  if (text) {
    try {
      data = JSON.parse(text) as HubtelSmsResponse & { message?: string };
    } catch {
      data = { StatusDescription: text };
    }
  }

  if (!response.ok) {
    const message =
      data.StatusDescription ??
      data.message ??
      `Hubtel SMS request failed (${response.status})`;
    logger.error("Hubtel SMS delivery failed", {
      to,
      status: response.status,
      message,
    });
    throw new Error(message);
  }

  logger.info("Hubtel SMS sent", {
    to,
    messageId: data.MessageId,
    status: data.Status,
  });

  return data;
}
