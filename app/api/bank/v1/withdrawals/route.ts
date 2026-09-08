import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiResponse } from "@/lib/api/handler";
import {
  assertBankPartnerAuth,
  bankPartnerService,
} from "@/lib/services/payment/bank-api.service";

const withdrawalSchema = z.object({
  userId: z.string().cuid(),
  bankAccountId: z.string().cuid(),
  amount: z.number().positive(),
  reference: z.string().min(6),
  partnerReference: z.string().min(6).optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  withdrawalRequestId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertBankPartnerAuth(req);
    const parsed = withdrawalSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse({ error: "Invalid withdrawal payload" }, 400);
    }

    const result = await bankPartnerService.processWithdrawal(parsed.data);
    const statusCode =
      "transaction" in result && result.transaction
        ? result.alreadyProcessed
          ? 200
          : 201
        : 202;
    return apiResponse(result, statusCode);
  } catch (error) {
    return apiError(error);
  }
}
