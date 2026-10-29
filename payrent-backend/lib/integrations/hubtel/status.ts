import { getHubtelPaymentsConfig } from "@/lib/integrations/hubtel/config";
import { hubtelRequest } from "@/lib/integrations/hubtel/client";
import type { HubtelPaymentStatus, HubtelTransactionData } from "@/lib/integrations/hubtel/types";

export async function getHubtelTransactionStatus(clientReference: string) {
  const config = getHubtelPaymentsConfig();
  if (!config) {
    throw new Error("Hubtel payments are not configured.");
  }

  const url = `${config.statusBaseUrl}/transactions/${config.merchantAccountNumber}/status?clientReference=${encodeURIComponent(clientReference)}`;

  const response = await hubtelRequest<HubtelTransactionData>({
    url,
    method: "GET",
    config,
  });

  const hubtelStatus = response.Data?.Status?.toLowerCase() ?? "";
  let status: HubtelPaymentStatus = "PENDING";
  if (["success", "successful", "completed", "paid"].includes(hubtelStatus)) {
    status = "SUCCESSFUL";
  } else if (["failed", "cancelled", "canceled", "declined"].includes(hubtelStatus)) {
    status = "FAILED";
  }

  return {
    responseCode: response.ResponseCode,
    message: response.Message,
    data: response.Data,
    status,
  };
}
