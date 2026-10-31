import { NextRequest } from "next/server";
import { z } from "zod";
import { apiResponse } from "@/lib/api/handler";
import { processReddePaymentCallback } from "@/lib/services/payment/redde-completion.service";

const schema = z.object({
  clientReference: z.string().min(3),
  amount: z.number().positive().optional(),
  status: z.string().optional().default("SUCCESS"),
});

/**
 * Development-only: simulate a Redde callback when localhost cannot receive webhooks.
 * POST with { "clientReference": "SUB-XXXXXXXX", "amount": 99.00 }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return apiResponse({ error: "Not available in production" }, 404);
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return apiResponse({ error: "Unauthorized" }, 401);
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return apiResponse({ error: "Invalid body" }, 400);
  }

  const result = await processReddePaymentCallback({
    clientreference: parsed.data.clientReference,
    amount: parsed.data.amount,
    status: parsed.data.status ?? "SUCCESS",
  });

  return apiResponse(result);
}
