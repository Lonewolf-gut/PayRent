import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiResponse } from "@/lib/api/handler";
import {
  assertBankPartnerAuth,
  bankPartnerService,
} from "@/lib/services/payment/bank-api.service";

const updateSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
  reference: z.string().min(6).optional(),
  failureCode: z.string().optional(),
  failureMessage: z.string().optional(),
  completedAt: z.string().datetime().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertBankPartnerAuth(req);
    const { id } = await context.params;
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse({ error: "Invalid withdrawal update payload" }, 400);
    }

    const result = await bankPartnerService.updateWithdrawalStatus(id, parsed.data);
    return apiResponse(result, 200);
  } catch (error) {
    return apiError(error);
  }
}
