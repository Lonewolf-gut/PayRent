import { getPaystackConfig } from "@/lib/integrations/paystack/config";

export type PaystackApiResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export async function paystackRequest<T>(
  path: string,
  init?: RequestInit
): Promise<PaystackApiResponse<T>> {
  const config = getPaystackConfig();

  if (!config.secretKey) {
    throw new Error("Paystack secret key is not configured.");
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const raw = await response.text();
  let json: PaystackApiResponse<T>;
  try {
    json = JSON.parse(raw) as PaystackApiResponse<T>;
  } catch {
    throw new Error(
      response.ok
        ? "Paystack returned an unexpected response. Please try again."
        : `Paystack request failed (${response.status}). Check your API keys and try again.`
    );
  }

  if (!response.ok || !json.status) {
    throw new Error(json.message || `Paystack request failed (${response.status})`);
  }

  return json;
}

export function toPaystackAmount(amountGhs: number) {
  return Math.round(amountGhs * 100);
}

export function fromPaystackAmount(amountMinor: number) {
  return amountMinor / 100;
}
