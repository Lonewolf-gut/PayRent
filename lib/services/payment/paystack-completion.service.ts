import { logger } from "@/lib/logger";
import { verifyPaystackTransaction } from "@/lib/integrations/paystack/transactions";
import { completeWalletDeposit } from "@/lib/services/payment/payment-completion.service";
import { completeSubscriptionPayment } from "@/lib/services/payment/subscription-completion.service";
import { getPendingPayment } from "@/lib/services/payment/pending-payment.store";
import { reconciliationService } from "@/lib/services/reconciliation.service";

export async function processPaystackSuccessfulCharge(params: {
  clientReference: string;
  amountGhs: number;
  transactionId?: string;
  channel?: string;
}) {
  const session = await getPendingPayment(params.clientReference);

  if (session && params.amountGhs != null && Math.abs(session.amount - params.amountGhs) > 0.01) {
    await reconciliationService.recordPaymentAmountMismatch({
      clientReference: params.clientReference,
      expectedAmount: session.amount,
      actualAmount: params.amountGhs,
      providerReference: params.transactionId,
    });
  }

  if (session?.purpose === "SUBSCRIPTION") {
    return completeSubscriptionPayment({
      clientReference: params.clientReference,
      amount: params.amountGhs,
      provider: "paystack",
      metadata: {
        paystackTransactionId: params.transactionId,
        channel: params.channel,
      },
    });
  }

  return completeWalletDeposit({
    clientReference: params.clientReference,
    amount: params.amountGhs,
    provider: "paystack",
    description: `Paystack deposit — ${params.channel ?? "checkout"}`,
    metadata: {
      paystackTransactionId: params.transactionId,
      channel: params.channel,
      method: session?.purpose === "WALLET_DEPOSIT" ? session.method : undefined,
      bankAccountId: session?.purpose === "WALLET_DEPOSIT" ? session.bankAccountId : undefined,
    },
  });
}

export async function verifyAndCompletePaystackPayment(reference: string) {
  const verified = await verifyPaystackTransaction(reference);

  if (verified.status !== "SUCCESSFUL") {
    return { status: verified.status, completed: false as const };
  }

  const result = await processPaystackSuccessfulCharge({
    clientReference: reference,
    amountGhs: verified.amountGhs,
    transactionId: verified.data.id ? String(verified.data.id) : undefined,
    channel: verified.data.channel,
  });

  logger.info("Paystack payment completed", { reference, purpose: result });

  return { status: "SUCCESSFUL" as const, completed: true as const, result };
}
