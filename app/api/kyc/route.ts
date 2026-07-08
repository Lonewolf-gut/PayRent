import { NextRequest } from "next/server";
import { profileSchema, firstProfileIssueMessage } from "@/lib/validations/kyc";
import { kycService } from "@/lib/services/kyc.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

const KYC_ROLES = ["BUYER", "MERCHANT", "LENDER", "MARKETER"] as const;

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
      const parsed = profileSchema.safeParse(body.data);
      if (!parsed.success) {
        return apiResponse(null, 400, firstProfileIssueMessage(parsed.error));
      }
      const updated = await kycService.updateProfile(
        session.user.id,
        session.user.role,
        parsed.data
      );
      return apiResponse(updated, 200, "Profile saved.");
    }

    return apiResponse(null, 400, "Invalid action.");
  },
  { roles: [...KYC_ROLES], permission: "kyc:manage" }
);
