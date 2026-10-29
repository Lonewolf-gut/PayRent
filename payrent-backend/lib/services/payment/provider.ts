import { isHubtelPaymentsConfigured } from "@/lib/integrations/hubtel/config";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";

export type PaymentProviderName = "hubtel" | "paystack" | "momo" | "log";

export function getPaymentProvider(): PaymentProviderName {
  const value = (process.env.PAYMENT_PROVIDER || "momo").trim().toLowerCase();
  if (value === "paystack" || value === "hubtel" || value === "momo" || value === "log") {
    return value;
  }
  return "momo";
}

export function isPaymentCollectionConfigured() {
  const provider = getPaymentProvider();
  if (provider === "paystack") return isPaystackConfigured();
  if (provider === "hubtel") return isHubtelPaymentsConfigured();
  if (provider === "momo") {
    return Boolean(
      process.env.MOMO_API_KEY?.trim() &&
        process.env.MOMO_SUBSCRIPTION_KEY?.trim() &&
        process.env.MOMO_API_USER?.trim()
    );
  }
  return false;
}

export function isPayoutConfigured() {
  return Boolean(process.env.BANK_API_KEY?.trim()) || isPaystackConfigured() || isHubtelPaymentsConfigured();
}

export function isPaystackLookupOnly() {
  return getPaymentProvider() === "momo" || getPaymentProvider() === "log";
}
