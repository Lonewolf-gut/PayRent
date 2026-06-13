import { NextRequest } from "next/server";
import {
  tenantProfileSchema,
  ghanaCardVerifySchema,
  bankAccountSchema,
} from "@/lib/validations/kyc";
import { kycService } from "@/lib/services/kyc.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

const KYC_ROLES = ["TENANT", "LANDLORD", "LENDER", "AGENT"] as const;

export const GET = withAuth(async (_req, _ctx, session) => {
  const status = await kycService.getVerificationStatus(
    session.user.id,
    session.user.role
  );
  return apiResponse(status, 200, "Verification status retrieved.");
});

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const action = body.action as string;

    if (action === "profile") {
      const parsed = tenantProfileSchema.safeParse(body.data);
      if (!parsed.success) return apiResponse(null, 400, "Validation failed.");
      const updated = await kycService.updateProfile(
        session.user.id,
        session.user.role,
        parsed.data
      );
      return apiResponse(updated, 200, "Profile saved.");
    }

    if (action === "ghana-card") {
      const parsed = ghanaCardVerifySchema.safeParse(body.data);
      if (!parsed.success) return apiResponse(null, 400, "Validation failed.");
      const verification = await kycService.submitGhanaCard(
        session.user.id,
        session.user.role,
        parsed.data
      );
      return apiResponse(
        verification,
        200,
        "Identity submitted for admin review."
      );
    }

    if (action === "bank-account") {
      const parsed = bankAccountSchema.safeParse(body.data);
      if (!parsed.success) return apiResponse(null, 400, "Validation failed.");
      const account = await kycService.addBankAccount(session.user.id, parsed.data);
      return apiResponse(account, 201, "Bank account submitted for validation.");
    }

    return apiResponse(null, 400, "Invalid action.");
  },
  { roles: [...KYC_ROLES], permission: "kyc:manage" }
);
