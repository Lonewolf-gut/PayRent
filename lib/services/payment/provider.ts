import { isHubtelPaymentsConfigured } from "@/lib/integrations/hubtel/config";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";

export type PaymentProviderName = "hubtel" | "paystack" | "momo" | "log";

export function getPaymentProvider(): PaymentProviderName {
  const value = (process.env.PAYMENT_PROVIDER || "hubtel").trim().toLowerCase();
  if (value === "paystack" || value === "hubtel" || value === "momo" || value === "log") {
    return value;
  }
  return "hubtel";
}

export function isPaymentCollectionConfigured() {
  const provider = getPaymentProvider();
  if (provider === "paystack") return isPaystackConfigured();
  if (provider === "hubtel") return isHubtelPaymentsConfigured();
  return false;
}

export function isPayoutConfigured() {
  return isPaystackConfigured() || isHubtelPaymentsConfigured();
}
