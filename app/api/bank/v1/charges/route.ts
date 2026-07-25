import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiResponse } from "@/lib/api/handler";
import {
  assertBankPartnerAuth,
  bankPartnerService,
} from "@/lib/services/payment/bank-api.service";

const chargeSchema = z.object({
  reference: z.string().min(6),
  userId: z.string().cuid(),
  bankAccountId: z.string().cuid(),
  amount: z.number().positive(),
  chargeType: z.enum(["INSTALLMENT", "INVOICE", "MANDATE"]),
  installmentId: z.string().cuid().optional(),
  mandateId: z.string().cuid().optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertBankPartnerAuth(req);
    const parsed = chargeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse({ error: "Invalid charge payload" }, 400);
    }

    const result = await bankPartnerService.createCharge(parsed.data);
    return apiResponse(result, result.alreadyProcessed ? 200 : 202);
  } catch (error) {
    return apiError(error);
  }
}
