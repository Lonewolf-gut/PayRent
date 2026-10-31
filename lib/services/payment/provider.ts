import { isReddeConfigured } from "@/lib/integrations/redde/config";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";

export type PaymentProviderName = "redde" | "log";

export function getPaymentProvider(): PaymentProviderName {
  const value = (process.env.PAYMENT_PROVIDER || "redde").trim().toLowerCase();
  if (value === "log") return "log";
  return "redde";
}

export function isPaymentCollectionConfigured() {
  if (getPaymentProvider() === "log") {
    return process.env.NODE_ENV === "development";
  }
  return isReddeConfigured();
}

export function isPayoutConfigured() {
  if (getPaymentProvider() === "log") {
    return process.env.NODE_ENV === "development";
  }
  return isReddeConfigured() || Boolean(process.env.BANK_API_KEY?.trim());
}

/** Paystack remains enabled for bank list / account resolve only — not collections. */
export function isPaystackLookupEnabled() {
  return isPaystackConfigured();
}

export function isPaystackLookupOnly() {
  return true;
}
