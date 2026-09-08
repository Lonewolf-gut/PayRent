import { NextRequest } from "next/server";
import { apiError, apiResponse } from "@/lib/api/handler";
import {
  assertBankPartnerAuth,
  bankPartnerService,
} from "@/lib/services/payment/bank-api.service";

export async function GET(req: NextRequest) {
  try {
    assertBankPartnerAuth(req);
    const accountNumber = req.nextUrl.searchParams.get("accountNumber");
    const bankCode = req.nextUrl.searchParams.get("bankCode");
    if (!accountNumber || !bankCode) {
      return apiResponse({ error: "accountNumber and bankCode are required" }, 400);
    }

    const result = await bankPartnerService.lookupUser(accountNumber, bankCode);
    return apiResponse(result, 200);
  } catch (error) {
    return apiError(error);
  }
}
