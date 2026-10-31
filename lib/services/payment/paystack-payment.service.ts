import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/lib/integrations/paystack/transactions";
import {
  createPaystackTransferRecipient,
  initiatePaystackTransfer,
} from "@/lib/integrations/paystack/transfers";
import { savePendingPayment } from "@/lib/services/payment/pending-payment.store";
import {
  getDepositPhoneFromAccount,
  getVerifiedUserBankAccount,
} from "@/lib/services/payment/bank-account-payment";
import type { BillingCycle, SubscriptionPlan, UserRole } from "@prisma/client";
import { getSubscriptionPrice } from "@/lib/subscription/pricing";
import type {
  CollectionRequest,
  CollectionResult,
  DepositFromAccountRequest,
} from "@/lib/services/payment/hubtel-payment.service";

export type SubscriptionCheckoutResult = {
  provider: "paystack" | "sandbox";
  reference: string;
  status: "PENDING" | "FAILED";
  amount: number;
  checkoutUrl?: string;
  message?: string;
};

export class PaystackPaymentService {
  private buildReference(prefix: string) {
    return `${prefix}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  private async getUserContext(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        phone: true,
        tenant: { select: { fullName: true } },
        landlord: { select: { fullName: true } },
        lender: { select: { fullName: true } },
        agentProfile: { select: { fullName: true } },
      },
    });
  }

  private resolveCustomerName(
    accountName: string | null | undefined,
    user: Awaited<ReturnType<typeof this.getUserContext>>
  ) {
    return (
      accountName ||
      user?.tenant?.fullName ||
      user?.landlord?.fullName ||
      user?.lender?.fullName ||
      user?.agentProfile?.fullName ||
      "PayRent User"
    );
  }

  async requestWalletDepositFromAccount(
    input: DepositFromAccountRequest
  ): Promise<CollectionResult> {
    const account = await getVerifiedUserBankAccount(input.userId, input.bankAccountId);
    const user = await this.getUserContext(input.userId);
    const customerName = this.resolveCustomerName(account.accountName, user);
    const phone = getDepositPhoneFromAccount(account, user?.phone);
    const reference = this.buildReference("PSK");
    const method = account.accountType === "MOMO" ? "MOMO" : "BANK";

    if (!isPaystackConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return {
          provider: "sandbox",
          reference,
          status: "PENDING",
          method,
          message: `Paystack sandbox — set PAYSTACK_SECRET_KEY to collect via ${method}.`,
        };
      }
      throw new Error("Paystack payments are not configured.");
    }

    const email = user?.email;
    if (!email) {
      throw new Error("A verified email address is required for Paystack deposits.");
    }

    await savePendingPayment(reference, {
      userId: input.userId,
      walletType: input.walletType,
      amount: input.amount,
      bankAccountId: account.id,
      method,
      phone,
      purpose: "WALLET_DEPOSIT",
      provider: "paystack",
    });

    const checkout = await initializePaystackTransaction({
      email,
      amountGhs: input.amount,
      reference,
      description: input.description ?? "PayRent wallet top-up",
      metadata: {
        userId: input.userId,
        walletType: input.walletType,
        bankAccountId: account.id,
        method,
        customerName,
      },
    });

    logger.info("Paystack deposit initiated", {
      reference,
      bankAccountId: account.id,
      userId: input.userId,
      method,
    });

    return {
      provider: "paystack",
      reference,
      status: "PENDING",
      method,
      checkoutUrl: checkout.authorizationUrl,
      message: "Complete payment on the Paystack checkout page to fund your wallet.",
    };
  }

  async requestWalletTopUp(input: CollectionRequest): Promise<CollectionResult> {
    if (input.bankAccountId) {
      return this.requestWalletDepositFromAccount({
        userId: input.userId,
        walletType: input.walletType,
        amount: input.amount,
        bankAccountId: input.bankAccountId,
        description: input.description,
      });
    }

    const reference = this.buildReference("PSK");

    if (!isPaystackConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return {
          provider: "sandbox",
          reference,
          status: "PENDING",
          message: "Paystack sandbox — configure credentials for live collections.",
        };
      }
      throw new Error("Paystack payments are not configured.");
    }

    const user = await this.getUserContext(input.userId);
    const email = user?.email;
    if (!email) {
      throw new Error("A verified email address is required for Paystack deposits.");
    }

    await savePendingPayment(reference, {
      userId: input.userId,
      walletType: input.walletType,
      amount: input.amount,
      bankAccountId: "",
      method: "MOMO",
      phone: input.phone,
      purpose: "WALLET_DEPOSIT",
      provider: "paystack",
    });

    const checkout = await initializePaystackTransaction({
      email,
      amountGhs: input.amount,
      reference,
      description: input.description ?? "PayRent wallet top-up",
      metadata: {
        userId: input.userId,
        walletType: input.walletType,
        phone: input.phone,
      },
    });

    logger.info("Paystack collection initiated", { reference, userId: input.userId });

    return {
      provider: "paystack",
      reference,
      status: "PENDING",
      checkoutUrl: checkout.authorizationUrl,
      message: "Complete payment on the Paystack checkout page to fund your wallet.",
    };
  }

  async verifyCollection(reference: string): Promise<CollectionResult> {
    if (!isPaystackConfigured()) {
      return { provider: "sandbox", reference, status: "PENDING" };
    }

    const result = await verifyPaystackTransaction(reference);
    return {
      provider: "paystack",
      reference,
      status: result.status,
      message: result.message,
      externalId: result.data?.id ? String(result.data.id) : undefined,
    };
  }

  async requestSubscriptionPayment(params: {
    userId: string;
    role: UserRole;
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
  }): Promise<SubscriptionCheckoutResult> {
    const amount = getSubscriptionPrice(params.plan, params.billingCycle);
    const reference = this.buildReference("SUB");
    const cycleLabel = params.billingCycle === "ANNUAL" ? "annual" : "monthly";

    if (!isPaystackConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return {
          provider: "sandbox",
          reference,
          status: "PENDING",
          amount,
          message: "Paystack sandbox — set PAYSTACK_SECRET_KEY for subscription checkout.",
        };
      }
      throw new Error("Paystack payments are not configured.");
    }

    const user = await this.getUserContext(params.userId);
    const email = user?.email;
    if (!email) {
      throw new Error("A verified email address is required for Paystack payments.");
    }

    await savePendingPayment(reference, {
      userId: params.userId,
      amount,
      purpose: "SUBSCRIPTION",
      plan: params.plan,
      billingCycle: params.billingCycle,
      role: params.role,
      provider: "paystack",
    });

    const checkout = await initializePaystackTransaction({
      email,
      amountGhs: amount,
      reference,
      description: `PayRent Premium ${cycleLabel} subscription`,
      metadata: {
        userId: params.userId,
        purpose: "SUBSCRIPTION",
        plan: params.plan,
        billingCycle: params.billingCycle,
      },
    });

    logger.info("Paystack subscription checkout initiated", {
      reference,
      userId: params.userId,
      amount,
      billingCycle: params.billingCycle,
    });

    return {
      provider: "paystack",
      reference,
      status: "PENDING",
      amount,
      checkoutUrl: checkout.authorizationUrl,
      message: "Complete payment on Paystack to activate Premium.",
    };
  }

  async disburseToBankAccount(params: {
    amount: number;
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode?: string | null;
    description: string;
    reference?: string;
  }) {
    const clientReference = params.reference ?? this.buildReference("PAY");

    if (!isPaystackConfigured()) {
      if (process.env.NODE_ENV === "development") {
        logger.info("Paystack bank payout skipped in dev", { clientReference });
        return {
          provider: "sandbox" as const,
          reference: clientReference,
          status: "SUCCESSFUL" as const,
        };
      }
      throw new Error("Paystack payments are not configured.");
    }

    const recipientCode = await createPaystackTransferRecipient({
      name: params.accountName,
      accountNumber: params.accountNumber,
      accountType: "BANK",
      bankName: params.bankName,
      bankCode: params.bankCode,
    });

    return initiatePaystackTransfer({
      amountGhs: params.amount,
      recipientCode,
      reason: params.description,
      reference: clientReference,
    });
  }

  async disburseToMobileMoney(params: {
    amount: number;
    phone: string;
    recipientName: string;
    bankName?: string;
    bankCode?: string | null;
    description: string;
    reference?: string;
  }) {
    const clientReference = params.reference ?? this.buildReference("PAY");

    if (!isPaystackConfigured()) {
      if (process.env.NODE_ENV === "development") {
        logger.info("Paystack MoMo payout skipped in dev", { clientReference });
        return {
          provider: "sandbox" as const,
          reference: clientReference,
          status: "SUCCESSFUL" as const,
        };
      }
      throw new Error("Paystack payments are not configured.");
    }

    const recipientCode = await createPaystackTransferRecipient({
      name: params.recipientName,
      accountNumber: params.phone,
      accountType: "MOMO",
      bankName: params.bankName ?? "MTN",
      bankCode: params.bankCode,
    });

    return initiatePaystackTransfer({
      amountGhs: params.amount,
      recipientCode,
      reason: params.description,
      reference: clientReference,
    });
  }
}

export const paystackPaymentService = new PaystackPaymentService();
