import { NextRequest } from "next/server";
import {
  tenantProfileSchema,
  ghanaCardVerifySchema,
  bankAccountSchema,
} from "@/lib/validations/kyc";
import { kycService } from "@/lib/services/kyc.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (_req, _ctx, session) => {
  const status = await kycService.getVerificationStatus(session.user.id);
  return apiResponse(status, 200, "Verification status retrieved.");
});

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const action = body.action as string;

    if (action === "profile") {
      const parsed = tenantProfileSchema.safeParse(body.data);
      if (!parsed.success) return apiResponse(null, 400, "Validation failed.");
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      if (!tenant) return apiResponse(null, 403, "Tenant profile required.");
      const updated = await kycService.updateTenantProfile(
        tenant.id,
        session.user.id,
        parsed.data
      );
      return apiResponse(updated, 200, "Tenant profile saved.");
    }

    if (action === "ghana-card") {
      const parsed = ghanaCardVerifySchema.safeParse(body.data);
      if (!parsed.success) return apiResponse(null, 400, "Validation failed.");
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      if (!tenant) return apiResponse(null, 403, "Tenant profile required.");
      const verification = await kycService.verifyGhanaCard(
        session.user.id,
        tenant.id,
        parsed.data
      );
      return apiResponse(verification, 200, "Identity verification completed.");
    }

    if (action === "bank-account") {
      const parsed = bankAccountSchema.safeParse(body.data);
      if (!parsed.success) return apiResponse(null, 400, "Validation failed.");
      const account = await kycService.addBankAccount(session.user.id, parsed.data);
      return apiResponse(account, 201, "Bank account submitted for validation.");
    }

    return apiResponse(null, 400, "Invalid action.");
  },
  { roles: ["TENANT"], permission: "kyc:manage" }
);
