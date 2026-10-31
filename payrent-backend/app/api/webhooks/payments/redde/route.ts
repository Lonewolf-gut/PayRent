import crypto from "crypto";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import {
  processReddePaymentCallback,
  verifyReddeCallbackAuth,
  verifyReddeCallbackBody,
} from "@/lib/services/payment/redde-completion.service";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const rawBody = await req.text();
    if (!verifyReddeCallbackAuth(req.headers, rawBody)) {
      logger.warn("Redde callback rejected", { requestId });
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyReddeCallbackBody(rawBody);
    const result = await processReddePaymentCallback(payload);

    logger.info("Redde callback processed", { requestId, ...result });
    return Response.json({ success: true, ...result });
  } catch (error) {
    logger.error("Redde callback error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    success: true,
    message: "Redde payment webhook endpoint",
  });
}
