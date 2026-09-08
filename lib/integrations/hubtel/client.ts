import { logger } from "@/lib/logger";
import {
  getHubtelBasicAuthHeader,
  getHubtelPaymentsConfig,
  type HubtelPaymentsConfig,
} from "@/lib/integrations/hubtel/config";
import type { HubtelApiResponse } from "@/lib/integrations/hubtel/types";

export async function hubtelRequest<T = Record<string, unknown>>(params: {
  url: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  config?: HubtelPaymentsConfig;
}): Promise<HubtelApiResponse<T>> {
  const config = params.config ?? getHubtelPaymentsConfig();
  if (!config) {
    throw new Error("Hubtel payments are not configured.");
  }

  const response = await fetch(params.url, {
    method: params.method ?? "POST",
    headers: {
      Authorization: getHubtelBasicAuthHeader(config),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  const text = await response.text();
  let data: HubtelApiResponse<T> = {};

  if (text) {
    try {
      data = JSON.parse(text) as HubtelApiResponse<T>;
    } catch {
      data = { Message: text };
    }
  }

  if (!response.ok) {
    const message =
      data.Message ??
      `Hubtel request failed (${response.status}) at ${params.url}`;
    logger.error("Hubtel API error", {
      url: params.url,
      status: response.status,
      message,
      responseCode: data.ResponseCode,
    });
    throw new Error(message);
  }

  return data;
}

export function isHubtelSuccess(responseCode?: string) {
  return responseCode === "0000" || responseCode === "0001";
}
