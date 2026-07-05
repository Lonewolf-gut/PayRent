import { isHubtelPaymentsConfigured } from "@/lib/integrations/hubtel/config";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import { hubtelPaymentService } from "@/lib/services/payment/hubtel-payment.service";
import { paystackPaymentService } from "@/lib/services/payment/paystack-payment.service";
import { getPaymentProvider } from "@/lib/services/payment/provider";

export function isPayoutConfigured() {
  const provider = getPaymentProvider();
  if (provider === "paystack") return isPaystackConfigured();
  if (provider === "hubtel") return isHubtelPaymentsConfigured();
  return isPaystackConfigured() || isHubtelPaymentsConfigured();
}

export async function disburseToBankAccount(params: {
  amount: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string | null;
  description: string;
  reference?: string;
}) {
  const provider = getPaymentProvider();

  if (provider === "paystack" || (provider !== "hubtel" && isPaystackConfigured())) {
    return paystackPaymentService.disburseToBankAccount(params);
  }

  if (provider === "hubtel" || isHubtelPaymentsConfigured()) {
    return hubtelPaymentService.disburseToBankAccount(params);
  }

  if (process.env.NODE_ENV === "development") {
    return {
      provider: "sandbox" as const,
      reference: params.reference ?? `PAY-${Date.now()}`,
      status: "SUCCESSFUL" as const,
    };
  }

  throw new Error("No payout provider configured.");
}

export async function disburseToMobileMoney(params: {
  amount: number;
  phone: string;
  recipientName: string;
  bankName?: string;
  bankCode?: string | null;
  description: string;
  reference?: string;
}) {
  const provider = getPaymentProvider();

  if (provider === "paystack" || (provider !== "hubtel" && isPaystackConfigured())) {
    return paystackPaymentService.disburseToMobileMoney(params);
  }

  if (provider === "hubtel" || isHubtelPaymentsConfigured()) {
    return hubtelPaymentService.disburseToMobileMoney({
      amount: params.amount,
      phone: params.phone,
      recipientName: params.recipientName,
      description: params.description,
      reference: params.reference,
    });
  }

  if (process.env.NODE_ENV === "development") {
    return {
      provider: "sandbox" as const,
      reference: params.reference ?? `PAY-${Date.now()}`,
      status: "SUCCESSFUL" as const,
    };
  }

  throw new Error("No payout provider configured.");
}
