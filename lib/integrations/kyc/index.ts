import { getKycProviderName } from "@/lib/config/kyc";
import { dojahKycProvider } from "@/lib/integrations/kyc/dojah.provider";
import { manualKycProvider } from "@/lib/integrations/kyc/manual.provider";
import type { KycProvider, KycProviderName } from "@/lib/integrations/kyc/types";

export function getKycProvider(): KycProvider {
  return getKycProviderName() === "dojah" ? dojahKycProvider : manualKycProvider;
}

export function getActiveKycProviderName(): KycProviderName {
  return getKycProviderName();
}

export * from "@/lib/integrations/kyc/types";
