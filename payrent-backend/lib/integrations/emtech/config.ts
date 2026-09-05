export type EmtechConfig = {
  enabled: boolean;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  deviceId: string;
  transactionChannel: "WEB" | "MOBILE_APP" | "OTHER";
};

export function getEmtechConfig(): EmtechConfig {
  const clientId = process.env.EMTECH_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.EMTECH_CLIENT_SECRET?.trim() ?? "";
  const explicitlyEnabled = process.env.EMTECH_ENABLED === "true";
  const explicitlyDisabled = process.env.EMTECH_ENABLED === "false";

  return {
    enabled:
      !explicitlyDisabled && (explicitlyEnabled || (Boolean(clientId) && Boolean(clientSecret))),
    baseUrl: (process.env.EMTECH_API_URL ?? "https://api.emtech.com/integration").replace(
      /\/$/,
      ""
    ),
    clientId,
    clientSecret,
    deviceId: process.env.EMTECH_DEVICE_ID?.trim() || "payforme-web",
    transactionChannel:
      process.env.EMTECH_TRANSACTION_CHANNEL === "MOBILE_APP" ? "MOBILE_APP" : "WEB",
  };
}

export function isEmtechConfigured() {
  return getEmtechConfig().enabled;
}
