import { NextRequest } from "next/server";
import { kycService } from "@/lib/services/kyc.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

const KYC_ROLES = ["TENANT", "LANDLORD", "LENDER", "AGENT"] as const;

export const POST = withAuth(
  async (_req: NextRequest, _ctx, session) => {
    return apiResponse(
      null,
      400,
      "Please submit identity verification with document uploads at /api/kyc/identity/submit."
    );
  },
  { roles: [...KYC_ROLES], permission: "kyc:manage" }
);
