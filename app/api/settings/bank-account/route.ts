import { NextRequest } from "next/server";
import { bankAccountSchema } from "@/lib/validations/kyc";
import { kycService } from "@/lib/services/kyc.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const parsed = bankAccountSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse({ error: parsed.error.flatten() }, 400);
  }

  const account = await kycService.addBankAccount(session.user.id, parsed.data);
  const message =
    account.isVerified
      ? "Bank or MoMo account verified and saved successfully."
      : "Bank or MoMo details added successfully.";
  return apiResponse(account, 201, message);
});
