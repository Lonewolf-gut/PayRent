import { getHubtelPaymentsConfig } from "@/lib/integrations/hubtel/config";
import { hubtelRequest, isHubtelSuccess } from "@/lib/integrations/hubtel/client";

export type HubtelCheckoutResult = {
  checkoutUrl?: string;
  checkoutDirectUrl?: string;
  clientReference?: string;
  responseCode?: string;
  message?: string;
};

export async function initiateHubtelCheckout(params: {
  amount: number;
  clientReference: string;
  description: string;
  payeeName: string;
  payeeEmail?: string;
  payeeMobileNumber: string;
  title?: string;
  callbackUrl?: string;
  returnUrl?: string;
  cancellationUrl?: string;
}) {
  const config = getHubtelPaymentsConfig();
  if (!config) {
    throw new Error("Hubtel payments are not configured.");
  }

  const checkoutUrl =
    process.env.HUBTEL_CHECKOUT_URL?.trim() ||
    "https://payproxyapi.hubtel.com/items/initiate";

  const appUrl = process.env.AUTH_URL?.trim() || "http://localhost:3000";

  const response = await hubtelRequest<{
    checkoutUrl?: string;
    checkoutDirectUrl?: string;
  }>({
    url: checkoutUrl,
    config,
    body: {
      merchantAccountNumber: config.merchantAccountNumber,
      totalAmount: params.amount,
      title: params.title ?? "PayRent wallet top-up",
      description: params.description,
      callbackUrl: params.callbackUrl ?? config.callbackUrl,
      returnUrl:
        params.returnUrl ??
        `${appUrl}/payment/hubtel/return?status=success&reference=${encodeURIComponent(params.clientReference)}`,
      cancellationUrl:
        params.cancellationUrl ?? `${appUrl}/payment/hubtel/return?status=cancelled`,
      payeeName: params.payeeName,
      payeeEmail: params.payeeEmail ?? "",
      payeeMobileNumber: params.payeeMobileNumber,
      clientReference: params.clientReference,
    },
  });

  const checkoutLink =
    response.Data?.checkoutUrl ?? response.Data?.checkoutDirectUrl;
  const ok = isHubtelSuccess(response.ResponseCode) && Boolean(checkoutLink);

  return {
    checkoutUrl: checkoutLink,
    checkoutDirectUrl: response.Data?.checkoutDirectUrl,
    clientReference: params.clientReference,
    responseCode: response.ResponseCode,
    message: response.Message,
    status: ok ? "PENDING" : "FAILED",
  } as HubtelCheckoutResult & { status: "PENDING" | "FAILED" };
}
