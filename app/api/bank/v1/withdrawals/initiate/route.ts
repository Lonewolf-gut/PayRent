import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiResponse } from "@/lib/api/handler";
import {
  assertBankPartnerAuth,
  bankPartnerService,
} from "@/lib/services/payment/bank-api.service";

const initiateSchema = z.object({
  withdrawalRequestId: z.string().cuid(),
});

export async function POST(req: NextRequest) {
  try {
    assertBankPartnerAuth(req);
    const parsed = initiateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse({ error: "Invalid withdrawal initiate payload" }, 400);
    }

    const result = await bankPartnerService.getWithdrawalInstruction(
      parsed.data.withdrawalRequestId
    );
    return apiResponse(result, 200);
  } catch (error) {
    return apiError(error);
  }
}
