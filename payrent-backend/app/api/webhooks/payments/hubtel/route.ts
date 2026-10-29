import crypto from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { hubtelPaymentService } from "@/lib/services/payment/hubtel-payment.service";
import { completeWalletDeposit } from "@/lib/services/payment/payment-completion.service";
import { notificationService } from "@/lib/services/notification.service";
import { getPendingPayment } from "@/lib/services/payment/pending-payment.store";
import { reconciliationService } from "@/lib/services/reconciliation.service";

const callbackSchema = z.object({
  ResponseCode: z.string().optional(),
  Message: z.string().optional(),
  Data: z
    .object({
      ClientReference: z.string().optional(),
      TransactionId: z.string().optional(),
      Amount: z.number().optional(),
      AmountAfterCharges: z.number().optional(),
      Description: z.string().optional(),
      Status: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const payload = await req.json();
    const parsed = callbackSchema.safeParse(payload);

    if (!parsed.success) {
      logger.warn("Invalid Hubtel callback payload", {
        requestId,
        issues: parsed.error.issues,
      });
      return Response.json({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    const { responseCode, data, isSuccess } =
      hubtelPaymentService.parseCallbackPayload(parsed.data);
    const clientReference = data?.ClientReference;

    if (!clientReference) {
      logger.warn("Hubtel callback missing ClientReference", { requestId });
      return Response.json({ success: false, message: "Missing reference" }, { status: 400 });
    }

    const session = await getPendingPayment(clientReference);
    const amount = data?.Amount ?? session?.amount ?? 0;

    if (session && data?.Amount != null && Math.abs(session.amount - data.Amount) > 0.01) {
      await reconciliationService.recordPaymentAmountMismatch({
        clientReference,
        expectedAmount: session.amount,
        actualAmount: data.Amount,
        providerReference: data?.TransactionId,
      });
    }

    if (isSuccess) {
      const depositSession = session?.purpose === "WALLET_DEPOSIT" ? session : undefined;
      await completeWalletDeposit({
        clientReference,
        amount,
        provider: "hubtel",
        description: `Hubtel ${depositSession?.method === "BANK" ? "bank/card" : "MoMo"} deposit — ${data?.Description ?? "wallet top-up"}`,
        metadata: {
          hubtelTransactionId: data?.TransactionId,
          responseCode,
          method: depositSession?.method,
          bankAccountId: depositSession?.bankAccountId,
        },
      });

      logger.info("Hubtel wallet deposit completed", {
        requestId,
        clientReference,
        amount,
      });

      return Response.json({ success: true });
    }

    if (session?.userId) {
      await reconciliationService.recordMismatch({
        relatedRecordType: "WalletDeposit",
        relatedRecordId: clientReference,
        exceptionType: "PAYMENT_FAILED",
        expectedAmount: session.amount,
        actualAmount: amount,
        providerReference: data?.TransactionId,
      });

      await notificationService.send({
        userId: session.userId,
        type: "PAYMENT_FAILED",
        channels: ["IN_APP", "EMAIL"],
        title: "Payment Failed",
        message:
          parsed.data.Message ??
          "Your Mobile Money payment could not be completed. Please try again.",
        metadata: {
          reference: clientReference,
          responseCode,
        },
      });
    }

    logger.info("Hubtel callback not successful", {
      requestId,
      clientReference,
      responseCode,
      status: data?.Status,
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Hubtel webhook error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}
