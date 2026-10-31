import { reddePaymentService } from "@/lib/services/payment/redde-payment.service";
import { getPaymentProvider } from "@/lib/services/payment/provider";
import { isReddeConfigured } from "@/lib/integrations/redde/config";

export function isPayoutConfiguredForProvider() {
  const provider = getPaymentProvider();
  if (provider === "log") return process.env.NODE_ENV === "development";
  return isReddeConfigured();
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
  if (!isPayoutConfiguredForProvider()) {
    if (process.env.NODE_ENV === "development") {
      return {
        provider: "sandbox" as const,
        reference: params.reference ?? `PAY-${Date.now()}`,
        status: "SUCCESSFUL" as const,
      };
    }
    throw new Error("Redde payouts are not configured.");
  }

  return reddePaymentService.disburseToBankAccount(params);
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
  if (!isPayoutConfiguredForProvider()) {
    if (process.env.NODE_ENV === "development") {
      return {
        provider: "sandbox" as const,
        reference: params.reference ?? `PAY-${Date.now()}`,
        status: "SUCCESSFUL" as const,
      };
    }
    throw new Error("Redde payouts are not configured.");
  }

  return reddePaymentService.disburseToMobileMoney(params);
}

// Re-export for legacy imports
export { isPayoutConfiguredForProvider as isPayoutConfigured };
