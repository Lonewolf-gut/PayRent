export type HubtelPaymentsConfig = {
  clientId: string;
  clientSecret: string;
  merchantAccountNumber: string;
  callbackUrl: string;
  receiveBaseUrl: string;
  sendBaseUrl: string;
  statusBaseUrl: string;
};

export function getHubtelPaymentsConfig(): HubtelPaymentsConfig | null {
  const clientId =
    process.env.HUBTEL_PAYMENTS_CLIENT_ID?.trim() ||
    process.env.HUBTEL_CLIENT_ID?.trim() ||
    process.env.HUBTEL_SMS_CLIENT_ID?.trim();
  const clientSecret =
    process.env.HUBTEL_PAYMENTS_CLIENT_SECRET?.trim() ||
    process.env.HUBTEL_CLIENT_SECRET?.trim() ||
    process.env.HUBTEL_SMS_CLIENT_SECRET?.trim();
  const merchantAccountNumber =
    process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER?.trim() || "";

  if (!clientId || !clientSecret || !merchantAccountNumber) {
    return null;
  }

  const appUrl = process.env.AUTH_URL?.trim() || "http://localhost:3000";

  return {
    clientId,
    clientSecret,
    merchantAccountNumber,
    callbackUrl:
      process.env.HUBTEL_PAYMENT_CALLBACK_URL?.trim() ||
      `${appUrl}/api/webhooks/payments/hubtel`,
    receiveBaseUrl:
      process.env.HUBTEL_RECEIVE_BASE_URL?.trim() || "https://rmp.hubtel.com",
    sendBaseUrl:
      process.env.HUBTEL_SEND_BASE_URL?.trim() || "https://smp.hubtel.com",
    statusBaseUrl:
      process.env.HUBTEL_STATUS_BASE_URL?.trim() ||
      "https://api-txnstatus.hubtel.com",
  };
}

export function isHubtelPaymentsConfigured() {
  return getHubtelPaymentsConfig() !== null;
}

export function getHubtelBasicAuthHeader(config: HubtelPaymentsConfig) {
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");
  return `Basic ${credentials}`;
}
