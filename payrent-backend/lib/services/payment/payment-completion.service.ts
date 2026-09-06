import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import type { WalletType } from "@prisma/client";
import {
  deletePendingPayment,
  getPendingPayment,
} from "@/lib/services/payment/pending-payment.store";
import { reconciliationService } from "@/lib/services/reconciliation.service";

export async function completeWalletDeposit(params: {
  clientReference: string;
  amount: number;
  provider: string;
  description: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  walletType?: WalletType;
}) {
  const existing = await prisma.walletTransaction.findUnique({
    where: { reference: params.clientReference },
  });

  if (existing?.status === "COMPLETED") {
    return { alreadyProcessed: true as const, transaction: existing };
  }

  const session = await getPendingPayment(params.clientReference);
  const depositSession = session?.purpose === "WALLET_DEPOSIT" ? session : undefined;
  const userId = params.userId ?? session?.userId;
  const walletType = params.walletType ?? depositSession?.walletType;

  if (!userId || !walletType) {
    logger.error("Wallet deposit completion missing session", {
      clientReference: params.clientReference,
    });
    throw new Error("Payment session not found");
  }

  if (session && Math.abs(session.amount - params.amount) > 0.01) {
    logger.warn("Payment callback amount mismatch", {
      clientReference: params.clientReference,
      expected: session.amount,
      received: params.amount,
    });
    await reconciliationService.recordPaymentAmountMismatch({
      clientReference: params.clientReference,
      expectedAmount: session.amount,
      actualAmount: params.amount,
      providerReference: params.metadata?.hubtelTransactionId as string | undefined,
    });
  }

  const amount = session?.amount ?? params.amount;

  const result = await walletService.deposit(
    userId,
    walletType,
    amount,
    params.description,
    params.clientReference
  );

  await prisma.walletTransaction.update({
    where: { id: result.transaction.id },
    data: {
      metadata: {
        provider: params.provider,
        ...(params.metadata ?? {}),
      },
    },
  });

  await deletePendingPayment(params.clientReference);

  await notificationService.send({
    userId,
    type: "PAYMENT_SUCCESSFUL",
    channels: ["IN_APP", "EMAIL"],
    title: "Payment Received",
    message: `GHS ${amount.toLocaleString()} has been added to your wallet`,
    metadata: {
      amount,
      reference: params.clientReference,
      type: "DEPOSIT",
    },
  });

  return { alreadyProcessed: false as const, transaction: result.transaction };
}
