import crypto from "crypto";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { parsePaystackChargeSuccess } from "@/lib/integrations/paystack/transactions";
import {
  parsePaystackWebhookEvent,
  verifyPaystackWebhookSignature,
} from "@/lib/integrations/paystack/webhook";
import {
  processPaystackSuccessfulCharge,
  verifyAndCompletePaystackPayment,
} from "@/lib/services/payment/paystack-completion.service";
import { notificationService } from "@/lib/services/notification.service";
import { getPendingPayment } from "@/lib/services/payment/pending-payment.store";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      logger.warn("Invalid Paystack webhook signature", { requestId });
      return Response.json({ success: false, message: "Invalid signature" }, { status: 401 });
    }

    const event = parsePaystackWebhookEvent(rawBody);

    if (event.event !== "charge.success") {
      logger.info("Paystack webhook ignored", { requestId, event: event.event });
      return Response.json({ success: true });
    }

    const charge = parsePaystackChargeSuccess({
      status: true,
      message: "ok",
      data: event.data,
    });

    const clientReference = charge.reference;
    if (!clientReference || !charge.isSuccess || charge.amountGhs == null) {
      return Response.json({ success: false, message: "Invalid charge payload" }, { status: 400 });
    }

    await processPaystackSuccessfulCharge({
      clientReference,
      amountGhs: charge.amountGhs,
      transactionId: charge.transactionId,
      channel: charge.channel,
    });

    logger.info("Paystack payment completed via webhook", {
      requestId,
      clientReference,
      amount: charge.amountGhs,
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Paystack webhook error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return Response.json({ success: false, message: "Missing reference" }, { status: 400 });
  }

  const session = await getPendingPayment(reference);
  if (!session) {
    return Response.json({ success: false, message: "Unknown reference" }, { status: 404 });
  }

  try {
    const result = await verifyAndCompletePaystackPayment(reference);
    if (result.status !== "SUCCESSFUL" && session.userId) {
      await notificationService.send({
        userId: session.userId,
        type: "PAYMENT_FAILED",
        channels: ["IN_APP", "EMAIL"],
        title: "Payment Failed",
        message: "Your payment could not be completed. Please try again.",
        metadata: { reference },
      });
    }
    return Response.json({ success: result.completed, status: result.status, data: result.result });
  } catch (error) {
    logger.error("Paystack callback verification failed", {
      reference,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ success: false, message: "Verification failed" }, { status: 500 });
  }
}
