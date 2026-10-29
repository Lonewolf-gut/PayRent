import type { KycProviderName } from "@/lib/integrations/kyc/types";

export function getKycProviderName(): KycProviderName {
  const value = process.env.KYC_PROVIDER?.trim().toLowerCase();
  if (value === "dojah") return "dojah";
  return "manual";
}

export function getDojahConfig() {
  const sandbox = process.env.DOJAH_SANDBOX !== "false";
  return {
    appId: process.env.DOJAH_APP_ID?.trim() ?? "",
    secretKey: process.env.DOJAH_SECRET_KEY?.trim() ?? "",
    baseUrl: sandbox
      ? (process.env.DOJAH_BASE_URL?.trim() ?? "https://sandbox.dojah.io")
      : (process.env.DOJAH_BASE_URL?.trim() ?? "https://api.dojah.io"),
    sandbox,
  };
}

export function isDojahConfigured(): boolean {
  const { appId, secretKey } = getDojahConfig();
  return Boolean(appId && secretKey);
}
