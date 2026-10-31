import { v4 as uuidv4 } from "uuid";
import type { BillingCycle, SubscriptionPlan, UserRole, WalletType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { reddeReceiveMoney, reddeSendMoney } from "@/lib/integrations/redde/client";
import {
  mapMomoBankNameToReddeOption,
  normalizeReddeWalletNumber,
  reddeBankReceiveOption,
} from "@/lib/integrations/redde/network";
import { isReddeConfigured } from "@/lib/integrations/redde/config";
import {
  getDepositPhoneFromAccount,
  getVerifiedUserBankAccount,
} from "@/lib/services/payment/bank-account-payment";
import { savePendingPayment } from "@/lib/services/payment/pending-payment.store";
import { createPaymentInvoice } from "@/lib/services/payment/payment-invoice.service";
import { getSubscriptionPrice } from "@/lib/subscription/pricing";
import { PLAN_CATALOG, normalizeSubscriptionPlan } from "@/lib/subscription/plans";

export type ReddeCollectionResult = {
  provider: "redde" | "sandbox";
  reference: string;
  invoiceNumber?: string;
  status: "PENDING" | "FAILED";
  method: "MOMO" | "BANK";
  message?: string;
  externalId?: string;
};

export class ReddePaymentService {
  private buildReference(prefix: string) {
    return `${prefix}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  private buildClientTransId() {
    return uuidv4().replace(/-/g, "").slice(0, 16);
  }

  private async initiateCollection(params: {
    userId: string;
    amount: number;
    reference: string;
    clientTransId: string;
    description: string;
    account: Awaited<ReturnType<typeof getVerifiedUserBankAccount>>;
    userPhone?: string | null;
    invoiceKind: "SUBSCRIPTION" | "WALLET_DEPOSIT" | "PROPERTY_PURCHASE";
    invoiceExtras?: Parameters<typeof createPaymentInvoice>[0];
    pendingSession: Parameters<typeof savePendingPayment>[1];
  }): Promise<ReddeCollectionResult> {
    const method = params.account.accountType === "MOMO" ? "MOMO" : "BANK";
    const paymentOption =
      method === "MOMO"
        ? mapMomoBankNameToReddeOption(params.account.bankName)
        : reddeBankReceiveOption();
    const walletNumber =
      method === "MOMO"
        ? normalizeReddeWalletNumber(
            getDepositPhoneFromAccount(params.account, params.userPhone)
          )
        : params.account.accountNumber.replace(/\s/g, "");

    const invoice = await createPaymentInvoice({
      kind: params.invoiceKind,
      amount: params.amount,
      userId: params.userId,
      paymentMethod: method,
      reddeClientReference: params.reference,
      reddeClientTransId: params.clientTransId,
      description: params.description,
      ...params.invoiceExtras,
      metadata: {
        bankAccountId: params.account.id,
        paymentOption,
        invoiceKind: params.invoiceKind,
      },
    });

    await savePendingPayment(params.reference, params.pendingSession);

    if (!isReddeConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return {
          provider: "sandbox",
          reference: params.reference,
          invoiceNumber: invoice.invoiceNumber,
          status: "PENDING",
          method,
          message:
            "Redde sandbox — set REDDE_APP_ID and REDDE_API_KEY for live MoMo/bank collections.",
        };
      }
      throw new Error("Redde payments are not configured.");
    }

    const response = await reddeReceiveMoney({
      amount: params.amount,
      clientReference: params.reference,
      clientTransId: params.clientTransId,
      description: `${params.description} · Invoice ${invoice.invoiceNumber}`,
      paymentOption,
      walletNumber,
    });

    if (!response.ok) {
      logger.error("Redde receive failed", {
        reference: params.reference,
        statusCode: response.statusCode,
        body: response.body,
      });
      return {
        provider: "redde",
        reference: params.reference,
        invoiceNumber: invoice.invoiceNumber,
        status: "FAILED",
        method,
        message: response.message ?? "Redde could not start this payment. Try again shortly.",
      };
    }

    const externalId =
      typeof response.body === "object" &&
      response.body !== null &&
      "transactionid" in response.body
        ? String((response.body as { transactionid?: unknown }).transactionid)
        : undefined;

    return {
      provider: "redde",
      reference: params.reference,
      invoiceNumber: invoice.invoiceNumber,
      status: "PENDING",
      method,
      externalId,
      message:
        method === "MOMO"
          ? `Invoice ${invoice.invoiceNumber}: approve the MoMo prompt on your phone to complete payment.`
          : `Invoice ${invoice.invoiceNumber}: follow the Redde bank payment prompt to complete payment.`,
    };
  }

  async requestSubscriptionPayment(input: {
    userId: string;
    role: UserRole;
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    bankAccountId: string;
  }) {
    const account = await getVerifiedUserBankAccount(input.userId, input.bankAccountId);
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { phone: true },
    });

    const amount = getSubscriptionPrice(input.plan, input.billingCycle);
    const reference = this.buildReference("SUB");
    const clientTransId = this.buildClientTransId();
    const planLabel = PLAN_CATALOG[normalizeSubscriptionPlan(input.plan)].name;
    const cycleLabel = input.billingCycle === "ANNUAL" ? "annual" : "monthly";

    return this.initiateCollection({
      userId: input.userId,
      amount,
      reference,
      clientTransId,
      description: `${planLabel} subscription (${cycleLabel})`,
      account,
      userPhone: user?.phone,
      invoiceKind: "SUBSCRIPTION",
      invoiceExtras: {
        subscriptionPlan: input.plan,
        billingCycle: input.billingCycle,
      },
      pendingSession: {
        purpose: "SUBSCRIPTION",
        userId: input.userId,
        amount,
        provider: "redde",
        plan: input.plan,
        billingCycle: input.billingCycle,
        role: input.role,
      },
    });
  }

  async requestWalletDepositFromAccount(input: {
    userId: string;
    walletType: WalletType;
    amount: number;
    bankAccountId: string;
    description?: string;
  }) {
    const account = await getVerifiedUserBankAccount(input.userId, input.bankAccountId);
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { phone: true },
    });
    const reference = this.buildReference("DEP");
    const clientTransId = this.buildClientTransId();

    return this.initiateCollection({
      userId: input.userId,
      amount: input.amount,
      reference,
      clientTransId,
      description: input.description ?? "PayForMe wallet deposit",
      account,
      userPhone: user?.phone,
      invoiceKind: "WALLET_DEPOSIT",
      pendingSession: {
        purpose: "WALLET_DEPOSIT",
        userId: input.userId,
        walletType: input.walletType,
        amount: input.amount,
        bankAccountId: account.id,
        method: account.accountType === "MOMO" ? "MOMO" : "BANK",
        provider: "redde",
      },
    });
  }

  async requestWalletTopUp(input: {
    userId: string;
    walletType: WalletType;
    amount: number;
    phone?: string;
    bankAccountId?: string;
    description?: string;
  }) {
    if (!input.bankAccountId) {
      throw new Error("Select a verified MoMo or bank account in Settings to pay with Redde.");
    }
    return this.requestWalletDepositFromAccount({
      userId: input.userId,
      walletType: input.walletType,
      amount: input.amount,
      bankAccountId: input.bankAccountId,
      description: input.description,
    });
  }

  async disburseToMobileMoney(params: {
    amount: number;
    phone: string;
    recipientName: string;
    bankName?: string;
    description: string;
    reference?: string;
  }) {
    const reference = params.reference ?? this.buildReference("OUT");
    const clientTransId = this.buildClientTransId();
    const paymentOption = mapMomoBankNameToReddeOption(params.bankName ?? "MTN");

    if (!isReddeConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return {
          provider: "sandbox" as const,
          reference,
          status: "SUCCESSFUL" as const,
        };
      }
      throw new Error("Redde payouts are not configured.");
    }

    const response = await reddeSendMoney({
      amount: params.amount,
      clientReference: reference,
      clientTransId,
      description: params.description,
      paymentOption,
      walletNumber: normalizeReddeWalletNumber(params.phone),
    });

    if (!response.ok) {
      throw new Error(response.message ?? "Redde payout failed.");
    }

    return {
      provider: "redde" as const,
      reference,
      status: "SUCCESSFUL" as const,
    };
  }

  async disburseToBankAccount(params: {
    amount: number;
    accountNumber: string;
    accountName: string;
    bankName: string;
    description: string;
    reference?: string;
  }) {
    const reference = params.reference ?? this.buildReference("OUT");
    const clientTransId = this.buildClientTransId();

    if (!isReddeConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return {
          provider: "sandbox" as const,
          reference,
          status: "SUCCESSFUL" as const,
        };
      }
      throw new Error("Redde payouts are not configured.");
    }

    const response = await reddeSendMoney({
      amount: params.amount,
      clientReference: reference,
      clientTransId,
      description: `${params.description} · ${params.accountName}`,
      paymentOption: reddeBankReceiveOption(),
      walletNumber: params.accountNumber.replace(/\s/g, ""),
    });

    if (!response.ok) {
      throw new Error(response.message ?? "Redde bank payout failed.");
    }

    return {
      provider: "redde" as const,
      reference,
      status: "SUCCESSFUL" as const,
    };
  }
}

export const reddePaymentService = new ReddePaymentService();
