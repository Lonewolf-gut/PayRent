import { NextRequest } from "next/server";
import { z } from "zod";
import { bankApiService, assertBankPartnerAuth } from "@/lib/services/payment/bank-api.service";
import { apiError, apiResponse } from "@/lib/api/handler";

const withdrawalSchema = z.object({
  userId: z.string().cuid(),
  bankAccountId: z.string().cuid(),
  amount: z.number().positive(),
  reference: z.string().min(6),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertBankPartnerAuth(req);
    const parsed = withdrawalSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse({ error: "Invalid withdrawal payload" }, 400);
    }

    const result = await bankApiService.withdraw(parsed.data);
    return apiResponse(result, result.alreadyProcessed ? 200 : 201);
  } catch (error) {
    return apiError(error);
  }
}
