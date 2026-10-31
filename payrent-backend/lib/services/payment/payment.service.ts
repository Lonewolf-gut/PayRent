import { isReddeConfigured } from "@/lib/integrations/redde/config";
import { reddePaymentService } from "@/lib/services/payment/redde-payment.service";
import { getPaymentProvider, isPaymentCollectionConfigured } from "@/lib/services/payment/provider";
import type { WalletType } from "@prisma/client";

export type WalletTopUpRequest = {
  userId: string;
  walletType: WalletType;
  amount: number;
  phone?: string;
  bankAccountId?: string;
  description?: string;
};

export type WalletDepositRequest = {
  userId: string;
  walletType: WalletType;
  amount: number;
  bankAccountId: string;
  description?: string;
};

export class PaymentService {
  async requestWalletDeposit(input: WalletDepositRequest) {
    if (getPaymentProvider() === "log" && !isPaymentCollectionConfigured()) {
      return {
        provider: "sandbox" as const,
        reference: `LOG-${Date.now()}`,
        status: "PENDING" as const,
        message: "Set PAYMENT_PROVIDER=redde and REDDE_* credentials for live deposits.",
      };
    }

    return reddePaymentService.requestWalletDepositFromAccount(input);
  }

  async requestWalletTopUp(input: WalletTopUpRequest) {
    if (!input.bankAccountId) {
      throw new Error("Select a verified MoMo or bank account in Settings to pay with Redde.");
    }

    if (getPaymentProvider() === "log" && !isReddeConfigured()) {
      return {
        provider: "sandbox" as const,
        reference: `LOG-${Date.now()}`,
        status: "PENDING" as const,
        message: "Configure Redde credentials for live collections.",
      };
    }

    return reddePaymentService.requestWalletTopUp(input);
  }

  async verifyWalletTopUp(reference: string) {
    const { getCompletedPayment, getPendingPayment } = await import(
      "@/lib/services/payment/pending-payment.store"
    );
    const completed = await getCompletedPayment<{ ok: boolean }>(reference);
    if (completed) {
      return {
        provider: "redde" as const,
        reference,
        status: "SUCCESSFUL" as const,
      };
    }

    const pending = await getPendingPayment(reference);
    if (pending) {
      return {
        provider: "redde" as const,
        reference,
        status: "PENDING" as const,
      };
    }

    return {
      provider: "sandbox" as const,
      reference,
      status: "PENDING" as const,
    };
  }
}

export const paymentService = new PaymentService();
