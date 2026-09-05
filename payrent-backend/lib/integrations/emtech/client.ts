import { getEmtechConfig } from "@/lib/integrations/emtech/config";
import type {
  EmtechAuthResponse,
  EmtechConsumerComplaintPayload,
  EmtechTransactionPayload,
} from "@/lib/integrations/emtech/types";
import { logger } from "@/lib/logger";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function fetchAccessToken(): Promise<string> {
  const config = getEmtechConfig();
  if (!config.enabled) {
    throw new Error("EMTECH integration is not configured");
  }

  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const response = await fetch(`${config.baseUrl}/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`EMTECH auth failed (${response.status}): ${raw.slice(0, 300)}`);
  }

  const data = JSON.parse(raw) as EmtechAuthResponse;
  if (!data.accessToken) {
    throw new Error("EMTECH auth response missing accessToken");
  }

  cachedToken = data.accessToken;
  tokenExpiresAt = Date.now() + (data.expiryMS ?? 86_400_000);
  return cachedToken;
}

async function emtechPost<T>(path: string, body: unknown): Promise<T> {
  const config = getEmtechConfig();
  const token = await fetchAccessToken();

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "x-sandbox-app-auth": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`EMTECH ${path} failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function postEmtechTransaction(payload: EmtechTransactionPayload) {
  return emtechPost("/compliance/payment-service/v2/transactions", payload);
}

export async function postEmtechConsumerComplaint(payload: EmtechConsumerComplaintPayload) {
  return emtechPost("/compliance/payment-service/v1/consumer-complaints", payload);
}

export function resetEmtechAuthCacheForTests() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

export async function verifyEmtechConnection() {
  const config = getEmtechConfig();
  if (!config.enabled) {
    return { ok: false as const, reason: "not_configured" };
  }

  try {
    await fetchAccessToken();
    return { ok: true as const };
  } catch (error) {
    logger.error("EMTECH connection check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
