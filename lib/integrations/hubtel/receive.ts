import { getHubtelPaymentsConfig } from "@/lib/integrations/hubtel/config";
import { hubtelRequest, isHubtelSuccess } from "@/lib/integrations/hubtel/client";
import { detectHubtelChannel, toHubtelMsisdn } from "@/lib/integrations/hubtel/channels";
import type { HubtelTransactionData } from "@/lib/integrations/hubtel/types";

export async function receiveHubtelMobileMoney(params: {
  amount: number;
  phone: string;
  customerName: string;
  customerEmail?: string;
  clientReference: string;
  description: string;
  channel?: string;
  callbackUrl?: string;
}) {
  const config = getHubtelPaymentsConfig();
  if (!config) {
    throw new Error("Hubtel payments are not configured.");
  }

  const url = `${config.receiveBaseUrl}/merchantaccount/merchants/${config.merchantAccountNumber}/receive/mobilemoney`;

  const response = await hubtelRequest<HubtelTransactionData>({
    url,
    config,
    body: {
      CustomerName: params.customerName,
      CustomerMsisdn: toHubtelMsisdn(params.phone),
      CustomerEmail: params.customerEmail ?? "noreply@rentforme.com",
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
