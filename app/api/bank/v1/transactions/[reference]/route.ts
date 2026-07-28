import { NextRequest } from "next/server";
import { apiError, apiResponse } from "@/lib/api/handler";
import {
  assertBankPartnerAuth,
  bankPartnerService,
} from "@/lib/services/payment/bank-api.service";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    assertBankPartnerAuth(_req);
    const { reference } = await context.params;
    const result = await bankPartnerService.getTransaction(decodeURIComponent(reference));
    return apiResponse(result, 200);
  } catch (error) {
    return apiError(error);
  }
}
