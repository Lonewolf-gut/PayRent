import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { isHubtelPaymentsConfigured } from "@/lib/integrations/hubtel/config";
import { receiveHubtelMobileMoney } from "@/lib/integrations/hubtel/receive";
import {
  sendHubtelBankTransfer,
  sendHubtelMobileMoney,
} from "@/lib/integrations/hubtel/send";
import { getHubtelTransactionStatus } from "@/lib/integrations/hubtel/status";
import { isHubtelSuccess } from "@/lib/integrations/hubtel/client";
import type { HubtelTransactionData } from "@/lib/integrations/hubtel/types";
import { savePendingPayment } from "@/lib/services/payment/pending-payment.store";
import {
  getDepositPhoneFromAccount,
  getHubtelPayeePhone,
  getVerifiedUserBankAccount,
} from "@/lib/services/payment/bank-account-payment";
import { initiateHubtelCheckout } from "@/lib/integrations/hubtel/checkout";
import type { WalletType } from "@prisma/client";

export type CollectionRequest = {
  userId: string;
  walletType: WalletType;
  amount: number;
  phone: string;
  bankAccountId?: string;
  description?: string;
};

export type DepositFromAccountRequest = {
  userId: string;
  walletType: WalletType;
  amount: number;
  bankAccountId: string;
  description?: string;
};

export type CollectionResult = {
  provider: "hubtel" | "paystack" | "sandbox";
  reference: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  message?: string;
  externalId?: string;
  checkoutUrl?: string;
  method?: "MOMO" | "BANK";
};

export class HubtelPaymentService {
  private buildReference(prefix: string) {
    return `${prefix}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  async requestWalletDepositFromAccount(
    input: DepositFromAccountRequest
  ): Promise<CollectionResult> {
    const account = await getVerifiedUserBankAccount(input.userId, input.bankAccountId);
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        email: true,
        phone: true,
        tenant: { select: { fullName: true } },
        landlord: { select: { fullName: true } },
        lender: { select: { fullName: true } },
        agentProfile: { select: { fullName: true } },
      },
    });

    const customerName =
      account.accountName ||
      user?.tenant?.fullName ||
      user?.landlord?.fullName ||
      user?.lender?.fullName ||
      user?.agentProfile?.fullName ||
      "PayRent User";

    const phone = getDepositPhoneFromAccount(account, user?.phone);
    const reference = this.buildReference("HTL");
    const method = account.accountType === "MOMO" ? "MOMO" : "BANK";

    if (!isHubtelPaymentsConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return {
          provider: "sandbox",
          reference,
          status: "PENDING",
          method,
          message: `Hubtel sandbox — configure credentials to collect via ${method}.`,
        };
      }
      throw new Error("Hubtel payments are not configured.");
    }

    await savePendingPayment(reference, {
      userId: input.userId,
      walletType: input.walletType,
      amount: input.amount,
      bankAccountId: account.id,
      method,
      phone,
      purpose: "WALLET_DEPOSIT",
      provider: "hubtel",
    });

    if (method === "MOMO") {
      const response = await receiveHubtelMobileMoney({
        amount: input.amount,
        phone,
        customerName,
        customerEmail: user?.email ?? undefined,
        clientReference: reference,
        description: input.description ?? "PayRent wallet top-up (MoMo)",
      });

      logger.info("Hubtel MoMo deposit initiated", {
        reference,
        bankAccountId: account.id,
        userId: input.userId,
      });

      return {
        provider: "hubtel",
        reference,
        status: response.status,
        message:
          response.message ??
          "Approve the payment prompt on your MoMo phone. Your wallet updates automatically.",
        externalId: response.data?.TransactionId,
        method: "MOMO",
      };
    }

    const checkout = await initiateHubtelCheckout({
      amount: input.amount,
      clientReference: reference,
      description: input.description ?? "PayRent wallet top-up (bank/card)",
      payeeName: customerName,
      payeeEmail: user?.email ?? undefined,
      payeeMobileNumber: getHubtelPayeePhone(account, user?.phone),
      title: "PayRent wallet top-up",
    });

    if (checkout.status === "FAILED" || !checkout.checkoutUrl) {
      return {
        provider: "hubtel",
        reference,
        status: "FAILED",
        method: "BANK",
        message: checkout.message ?? "Could not start bank checkout.",
      };
    }

    logger.info("Hubtel bank checkout initiated", {
      reference,
      bankAccountId: account.id,
      userId: input.userId,
    });

    return {
      provider: "hubtel",
      reference,
      status: "PENDING",
      method: "BANK",
      checkoutUrl: checkout.checkoutUrl,
      message: "Complete payment on the Hubtel checkout page to fund your wallet.",
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

    const reference = this.buildReference("HTL");

    if (!isHubtelPaymentsConfigured()) {
      if (process.env.NODE_ENV === "development") {
        return {
          provider: "sandbox",
          reference,
          status: "PENDING",
          message: "Hubtel sandbox — approve payment on your phone in dev or configure credentials.",
        };
      }
      throw new Error("Hubtel payments are not configured.");
    }

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        email: true,
        tenant: { select: { fullName: true } },
        landlord: { select: { fullName: true } },
        lender: { select: { fullName: true } },
        agentProfile: { select: { fullName: true } },
      },
    });

    const customerName =
      user?.tenant?.fullName ??
      user?.landlord?.fullName ??
      user?.lender?.fullName ??
      user?.agentProfile?.fullName ??
      "PayRent User";

    await savePendingPayment(reference, {
      userId: input.userId,
      walletType: input.walletType,
      amount: input.amount,
      bankAccountId: "",
      method: "MOMO",
      phone: input.phone,
      purpose: "WALLET_DEPOSIT",
      provider: "hubtel",
    });

    const response = await receiveHubtelMobileMoney({
      amount: input.amount,
      phone: input.phone,
      customerName,
      customerEmail: user?.email ?? undefined,
      clientReference: reference,
      description: input.description ?? "PayRent wallet top-up",
    });

    logger.info("Hubtel collection initiated", {
      reference,
      responseCode: response.responseCode,
      userId: input.userId,
    });

    return {
      provider: "hubtel",
      reference,
      status: response.status,
      message: response.message,
      externalId: response.data?.TransactionId,
    };
  }

  async verifyCollection(reference: string): Promise<CollectionResult> {
    if (!isHubtelPaymentsConfigured()) {
      return { provider: "sandbox", reference, status: "PENDING" };
    }

    const result = await getHubtelTransactionStatus(reference);
    return {
      provider: "hubtel",
      reference,
      status: result.status,
      message: result.message,
      externalId: result.data?.TransactionId,
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

    if (!isHubtelPaymentsConfigured()) {
      if (process.env.NODE_ENV === "development") {
        logger.info("Hubtel bank payout skipped in dev", { clientReference });
        return { provider: "sandbox" as const, reference: clientReference, status: "SUCCESSFUL" as const };
      }
      throw new Error("Hubtel payments are not configured.");
    }

    return sendHubtelBankTransfer({
      amount: params.amount,
      accountNumber: params.accountNumber,
      accountName: params.accountName,
      bankName: params.bankName,
      bankCode: params.bankCode,
      clientReference,
      description: params.description,
    });
  }

  async disburseToMobileMoney(params: {
    amount: number;
    phone: string;
    recipientName: string;
    description: string;
    reference?: string;
  }) {
    const clientReference = params.reference ?? this.buildReference("PAY");

    if (!isHubtelPaymentsConfigured()) {
      if (process.env.NODE_ENV === "development") {
        logger.info("Hubtel MoMo payout skipped in dev", { clientReference });
        return { provider: "sandbox" as const, reference: clientReference, status: "SUCCESSFUL" as const };
      }
      throw new Error("Hubtel payments are not configured.");
    }

    return sendHubtelMobileMoney({
      amount: params.amount,
      phone: params.phone,
      recipientName: params.recipientName,
      clientReference,
      description: params.description,
    });
  }

  parseCallbackPayload(payload: unknown): {
    responseCode?: string;
    data?: HubtelTransactionData;
    isSuccess: boolean;
  } {
    const body = payload as {
      ResponseCode?: string;
      Data?: HubtelTransactionData;
    };

    return {
      responseCode: body.ResponseCode,
      data: body.Data,
      isSuccess: isHubtelSuccess(body.ResponseCode),
    };
  }
}

export const hubtelPaymentService = new HubtelPaymentService();
