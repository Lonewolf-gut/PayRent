import { createHmac, timingSafeEqual } from "crypto";
import { AppError } from "@/lib/errors";

export function isBankPartnerApiConfigured() {
  return Boolean(process.env.BANK_API_KEY?.trim());
}

export function assertBankPartnerAuth(req: Request) {
  const configured = process.env.BANK_API_KEY?.trim();
  if (!configured) {
    throw new AppError("Bank API is not configured", 503, "BANK_API_DISABLED");
  }

  const provided = req.headers.get("x-bank-api-key")?.trim();
  if (!provided || provided !== configured) {
    throw new AppError("Invalid bank API credentials", 401, "BANK_API_UNAUTHORIZED");
  }
}

export function assertBankWebhookAuth(req: Request, rawBody: string) {
  assertBankPartnerAuth(req);

  const secret = process.env.BANK_WEBHOOK_SECRET?.trim() || process.env.BANK_API_KEY?.trim();
  if (!secret) return;

  const signature = req.headers.get("x-bank-signature")?.trim();
  if (!signature) {
    throw new AppError("Missing webhook signature", 401, "BANK_WEBHOOK_UNAUTHORIZED");
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const provided = signature.startsWith("sha256=") ? signature : `sha256=${signature}`;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new AppError("Invalid webhook signature", 401, "BANK_WEBHOOK_UNAUTHORIZED");
  }
}
