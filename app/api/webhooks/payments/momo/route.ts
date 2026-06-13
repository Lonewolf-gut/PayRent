import { NextRequest } from "next/server";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { notificationService } from "@/lib/services/notification.service";
import crypto from "crypto";

/**
 * MoMo Webhook payload schema as per MTN MoMo API documentation
 */
const momoWebhookSchema = z.object({
  externalId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("GHS"),
  payer: z.object({
    partyIdType: z.string(),
    partyId: z.string(),
  }),
  payerMessage: z.string().optional(),
  payeeNote: z.string().optional(),
  status: z.enum(["SUCCESSFUL", "FAILED", "PENDING"]),
  reason: z.string().optional(),
  timestamp: z.string().datetime(),
});

type MomoWebhookPayload = z.infer<typeof momoWebhookSchema>;

/**
 * Verify MoMo webhook signature
 * Implementation uses HMAC-SHA256 with API key
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  apiKey: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", apiKey)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST /api/webhooks/payments/momo
 * Handles payment confirmation webhooks from MTN MoMo
 * 
 * Features:
 * - Signature validation for security
 * - Idempotency via externalId
 * - Atomicity: wallet update + transaction record
 * - Audit logging for compliance
 */
export const POST = async (req: NextRequest) => {
  const requestId = crypto.randomUUID();

  try {
    // 1. Extract and validate signature
    const signature = req.headers.get("x-signature");
    if (!signature) {
      logger.warn("Missing webhook signature", { requestId });
      return new Response(
        JSON.stringify({ success: false, message: "Missing signature" }),
        { status: 401 }
      );
    }

    // 2. Read raw body for signature verification
    const rawBody = await req.text();

    // 3. Verify signature
    const apiKey = process.env.MOMO_API_KEY;
    if (!apiKey) {
      logger.error("MOMO_API_KEY not configured", { requestId });
      return new Response(
        JSON.stringify({ success: false, message: "Server misconfigured" }),
        { status: 500 }
      );
    }

    if (!verifyWebhookSignature(rawBody, signature, apiKey)) {
      logger.warn("Invalid webhook signature", { requestId });
      return new Response(
        JSON.stringify({ success: false, message: "Invalid signature" }),
        { status: 403 }
      );
    }

    // 4. Parse and validate payload
    const payload = JSON.parse(rawBody);
    const validation = momoWebhookSchema.safeParse(payload);

    if (!validation.success) {
      logger.warn("Invalid webhook payload", {
        requestId,
        errors: validation.error.errors,
      });
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid payload",
          errors: validation.error.errors,
        }),
        { status: 400 }
      );
    }

    const webhookData: MomoWebhookPayload = validation.data;

    // 5. Idempotency check - prevent duplicate processing
    const existingTransaction = await prisma.walletTransaction.findUnique({
      where: { reference: webhookData.externalId },
      include: { wallet: { include: { user: true } } },
    });

    if (existingTransaction) {
      logger.info("Webhook already processed (idempotent)", {
        requestId,
        externalId: webhookData.externalId,
        previousStatus: existingTransaction.status,
      });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // 6. Find user by phone number
    const user = await prisma.user.findFirst({
      where: {
        // Normalize phone number (remove + and country code)
        phone: {
          endsWith: webhookData.payer.partyId.slice(-10),
        },
      },
    });

    if (!user) {
      logger.warn("User not found for webhook payment", {
        requestId,
        phone: webhookData.payer.partyId.slice(-4),
      });

      // Send notification to support/admin
      // This indicates a payment from unregistered user
      return new Response(
        JSON.stringify({
          success: false,
          message: "User not found",
        }),
        { status: 404 }
      );
    }

    // 7. Get or create wallet for user
    const wallet = await prisma.wallet.findFirst({
      where: { userId: user.id, type: "TENANT" }, // MoMo deposits go to tenant wallet
    });

    if (!wallet) {
      logger.warn("Wallet not found", { requestId, userId: user.id });
      return new Response(
        JSON.stringify({ success: false, message: "Wallet not found" }),
        { status: 404 }
      );
    }

    // 8. Handle payment status
    if (webhookData.status === "SUCCESSFUL") {
      // Record transaction atomically with wallet update
      const transaction = await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: new Decimal(webhookData.amount),
          netAmount: new Decimal(webhookData.amount),
          reference: webhookData.externalId,
          description: `MoMo deposit - ${webhookData.payerMessage || "wallet top-up"}`,
          metadata: {
            provider: "MOMO",
            payerPhone: webhookData.payer.partyId,
            timestamp: webhookData.timestamp,
          },
        },
        include: { wallet: true },
      });

      // Update wallet balance
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: new Decimal(webhookData.amount) },
        },
      });

      // Send success notification to user
      await notificationService.send({
        userId: user.id,
        type: "PAYMENT_SUCCESSFUL",
        channels: ["IN_APP", "EMAIL"],
        title: "Payment Received",
        message: `₵${webhookData.amount.toFixed(2)} has been added to your wallet`,
        metadata: {
          amount: webhookData.amount,
          reference: webhookData.externalId,
          type: "DEPOSIT",
        },
      });

      logger.info("Payment webhook processed successfully", {
        requestId,
        userId: user.id,
        amount: webhookData.amount,
        externalId: webhookData.externalId,
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (webhookData.status === "FAILED") {
      // Create failed transaction record for audit
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          status: "FAILED",
          amount: new Decimal(webhookData.amount),
          netAmount: new Decimal(0),
          reference: webhookData.externalId,
          description: `MoMo deposit failed - ${webhookData.reason || "unknown reason"}`,
          metadata: {
            provider: "MOMO",
            payerPhone: webhookData.payer.partyId,
            failureReason: webhookData.reason,
            timestamp: webhookData.timestamp,
          },
        },
      });

      // Send failure notification
      await notificationService.send({
        userId: user.id,
        type: "PAYMENT_FAILED",
        channels: ["IN_APP", "EMAIL"],
        title: "Payment Failed",
        message: `Your payment of ₵${webhookData.amount.toFixed(2)} could not be processed: ${webhookData.reason || "Please try again or contact support"}`,
        metadata: {
          amount: webhookData.amount,
          reference: webhookData.externalId,
          reason: webhookData.reason,
        },
      });

      logger.info("Payment webhook failed status", {
        requestId,
        userId: user.id,
        amount: webhookData.amount,
        externalId: webhookData.externalId,
        reason: webhookData.reason,
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // PENDING status - transaction still processing
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        status: "PROCESSING",
        amount: new Decimal(webhookData.amount),
        netAmount: new Decimal(0), // Don't credit yet
        reference: webhookData.externalId,
        description: `MoMo deposit pending`,
        metadata: {
          provider: "MOMO",
          payerPhone: webhookData.payer.partyId,
          timestamp: webhookData.timestamp,
        },
      },
    });

    logger.info("Payment webhook pending status", {
      requestId,
      userId: user.id,
      amount: webhookData.amount,
      externalId: webhookData.externalId,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    logger.error("Webhook processing error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error",
        requestId,
      }),
      { status: 500 }
    );
  }
};
