import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiResponse } from "@/lib/api/handler";
import { assertBankWebhookAuth } from "@/lib/services/payment/bank-partner-auth";
import { bankPartnerService } from "@/lib/services/payment/bank-partner.service";

const webhookSchema = z.object({
  event: z.string().min(3),
}).passthrough();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    assertBankWebhookAuth(req, rawBody);
    const payload = webhookSchema.parse(JSON.parse(rawBody));
    const { event, ...data } = payload;
    const result = await bankPartnerService.handleWebhook(event, data);
    return apiResponse({ received: true, result }, 200);
  } catch (error) {
    return apiError(error);
  }
}
