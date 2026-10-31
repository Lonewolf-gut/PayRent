import { logger } from "@/lib/logger";
import { parseReddeCallback } from "@/lib/integrations/redde/client";
import { getReddeCallbackSecret } from "@/lib/integrations/redde/config";
import { completeSubscriptionPayment } from "@/lib/services/payment/subscription-completion.service";
import { completeWalletDeposit } from "@/lib/services/payment/payment-completion.service";
import {
  getCompletedPayment,
  getPendingPayment,
} from "@/lib/services/payment/pending-payment.store";
import { markPaymentInvoiceStatus } from "@/lib/services/payment/payment-invoice.service";

export function verifyReddeCallbackAuth(headers: Headers, rawBody: string) {
  const secret = getReddeCallbackSecret();
  if (!secret) return true;
  const headerSecret =
    headers.get("x-redde-secret") ??
    headers.get("x-callback-secret") ??
    headers.get("authorization");
  return headerSecret === secret || headerSecret === `Bearer ${secret}`;
}

export async function processReddePaymentCallback(payload: Record<string, unknown>) {
  const parsed = parseReddeCallback(payload);

  if (!parsed.clientReference) {
    logger.warn("Redde callback missing client reference", { payload });
    return { handled: false as const, reason: "missing_reference" as const };
  }

  if (!parsed.success) {
    await markPaymentInvoiceStatus(parsed.clientReference, "FAILED", {
      metadata: { callbackStatus: parsed.rawStatus },
    });
    return { handled: true as const, status: "failed" as const, reference: parsed.clientReference };
  }

  const completed = await getCompletedPayment<{ subscriptionId?: string }>(
    parsed.clientReference
  );
  if (completed) {
    return { handled: true as const, status: "duplicate" as const, reference: parsed.clientReference };
  }

  const session = await getPendingPayment(parsed.clientReference);
  if (!session) {
    logger.error("Redde callback with unknown session", {
      clientReference: parsed.clientReference,
    });
    return { handled: false as const, reason: "unknown_session" as const };
  }

  const amount = session.amount || parsed.amount;

  if (session.purpose === "SUBSCRIPTION") {
    await completeSubscriptionPayment({
      clientReference: parsed.clientReference,
      amount,
      provider: "redde",
      metadata: {
        reddeTransactionId: parsed.transactionId,
        clientTransId: parsed.clientTransId,
      },
    });
  } else if (session.purpose === "WALLET_DEPOSIT") {
    await completeWalletDeposit({
      clientReference: parsed.clientReference,
      amount,
      provider: "redde",
      description: "Wallet deposit via Redde",
      metadata: {
        reddeTransactionId: parsed.transactionId,
        clientTransId: parsed.clientTransId,
      },
    });
  } else if (session.purpose === "PROPERTY_PURCHASE") {
    const { propertyPurchaseService } = await import(
      "@/lib/services/property-purchase.service"
    );
    await propertyPurchaseService.completeReddePurchase({
      clientReference: parsed.clientReference,
      amount,
    });
  }

  await markPaymentInvoiceStatus(parsed.clientReference, "PAID", {
    reddeTransactionId: parsed.transactionId || undefined,
    paidAt: new Date(),
    metadata: {
      callbackStatus: parsed.rawStatus,
      clientTransId: parsed.clientTransId,
    },
  });

  return {
    handled: true as const,
    status: "completed" as const,
    reference: parsed.clientReference,
    purpose: session.purpose,
  };
}

export async function verifyReddeCallbackBody(rawBody: string) {
  let payload: Record<string, unknown> = {};
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    }
  }
  return payload;
}
