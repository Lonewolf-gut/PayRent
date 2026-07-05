import { momoService } from "@/lib/services/payment/momo.service";
import { hubtelPaymentService } from "@/lib/services/payment/hubtel-payment.service";
import { paystackPaymentService } from "@/lib/services/payment/paystack-payment.service";
import {
  getPaymentProvider,
  isPaymentCollectionConfigured,
} from "@/lib/services/payment/provider";
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
    const provider = getPaymentProvider();

    if (provider === "paystack") {
      return paystackPaymentService.requestWalletDepositFromAccount(input);
    }

    if (provider === "hubtel") {
      return hubtelPaymentService.requestWalletDepositFromAccount(input);
    }

    if (provider === "log" || (process.env.NODE_ENV === "development" && !isPaymentCollectionConfigured())) {
      return {
        provider: "sandbox" as const,
        reference: `LOG-${Date.now()}`,
        status: "PENDING" as const,
        message: "Configure PAYMENT_PROVIDER=paystack or hubtel for live deposits.",
      };
    }

    throw new Error(`Deposits require paystack or hubtel when PAYMENT_PROVIDER=${provider}`);
  }

  async requestWalletTopUp(input: WalletTopUpRequest) {
    if (input.bankAccountId) {
      return this.requestWalletDeposit({
        userId: input.userId,
        walletType: input.walletType,
        amount: input.amount,
        bankAccountId: input.bankAccountId,
        description: input.description,
      });
    }

    const provider = getPaymentProvider();

    if (provider === "paystack") {
      if (!input.phone) {
        throw new Error("Phone number is required for Mobile Money top-up.");
      }
      return paystackPaymentService.requestWalletTopUp({
        ...input,
        phone: input.phone,
      });
    }

    if (provider === "hubtel") {
      if (!input.phone) {
        throw new Error("Phone number is required for Mobile Money top-up.");
      }
      return hubtelPaymentService.requestWalletTopUp({
        ...input,
        phone: input.phone,
      });
    }

    if (provider === "momo") {
      if (!input.phone) {
        throw new Error("Phone number is required for Mobile Money top-up.");
      }
      const payment = await momoService.requestPayment({
        amount: input.amount,
        phone: input.phone,
        description: input.description ?? "RentVest wallet top-up",
      });

      return {
        provider: "momo" as const,
        reference: payment.reference,
        status: payment.status,
        message: payment.message,
        externalId: payment.externalId,
      };
    }

    if (provider === "log" || (process.env.NODE_ENV === "development" && !isPaymentCollectionConfigured())) {
      return {
        provider: "sandbox" as const,
        reference: `LOG-${Date.now()}`,
        status: "PENDING" as const,
        message: "Configure PAYMENT_PROVIDER=paystack or hubtel for live collections.",
      };
    }

    throw new Error(`Payment provider "${provider}" is not supported`);
  }

  async verifyWalletTopUp(reference: string) {
    const provider = getPaymentProvider();

    if (provider === "paystack") {
      return paystackPaymentService.verifyCollection(reference);
    }

    if (provider === "hubtel") {
      return hubtelPaymentService.verifyCollection(reference);
    }

    if (provider === "momo") {
      const payment = await momoService.verifyPayment(reference);
      return {
        provider: "momo" as const,
        reference: payment.reference,
        status: payment.status,
        message: payment.message,
        externalId: payment.externalId,
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
