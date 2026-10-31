import crypto from "crypto";
import { getPaystackConfig } from "@/lib/integrations/paystack/config";
import type { PaystackWebhookEvent } from "@/lib/integrations/paystack/types";

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  const { webhookSecret, secretKey } = getPaystackConfig();
  const secret = webhookSecret || secretKey;

  if (!secret || !signature) return false;

  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

export function parsePaystackWebhookEvent(rawBody: string): PaystackWebhookEvent {
  return JSON.parse(rawBody) as PaystackWebhookEvent;
}
