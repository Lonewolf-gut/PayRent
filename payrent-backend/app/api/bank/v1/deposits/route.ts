import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiResponse } from "@/lib/api/handler";
import {
  assertBankPartnerAuth,
  bankPartnerService,
} from "@/lib/services/payment/bank-api.service";

const depositSchema = z.object({
  userId: z.string().cuid(),
  amount: z.number().positive(),
  reference: z.string().min(6),
  partnerReference: z.string().min(6).optional(),
  bankCode: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertBankPartnerAuth(req);
    const parsed = depositSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse({ error: "Invalid deposit payload" }, 400);
    }

    const result = await bankPartnerService.processDeposit(parsed.data);
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
