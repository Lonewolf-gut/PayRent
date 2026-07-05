import { NextRequest } from "next/server";
import { kycService } from "@/lib/services/kyc.service";
import { settlementService } from "@/lib/services/settlement.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const type = req.nextUrl.searchParams.get("type");

    if (type === "kyc") {
      const reviews = await kycService.getPendingKycReviews();
      return apiResponse(reviews, 200, "KYC review queue retrieved.");
    }

    if (type === "mandate") {
      const { mandateService } = await import("@/lib/services/mandate.service");
      const mandates = await mandateService.listPendingReview();
      return apiResponse(mandates, 200, "Mandate review queue retrieved.");
    }

    if (type === "reconciliation") {
      const exceptions = await settlementService.listReconciliationExceptions();
      return apiResponse(exceptions, 200, "Reconciliation exceptions retrieved.");
    }

    return apiResponse([], 200, "Review queue retrieved.");
  },
  { roles: ["ADMIN"] }
);

export const PATCH = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const { bankAccountId, verificationId, exceptionId, resolutionNote, rejectReason } =
      body;

    if (verificationId && rejectReason) {
      const verification = await kycService.rejectIdentityVerification(
        verificationId,
        session.user.id,
        String(rejectReason)
      );
      return apiResponse(verification, 200, "Identity verification rejected.");
    }

    if (verificationId) {
      const verification = await kycService.approveIdentityVerification(
        verificationId,
        session.user.id
      );
      return apiResponse(verification, 200, "Identity verification approved.");
    }

    if (bankAccountId) {
      const account = await kycService.validateBankAccount(
        bankAccountId,
        session.user.id
      );
      return apiResponse(account, 200, "Bank account validated.");
    }

    if (exceptionId) {
      const exception = await settlementService.resolveException(
        exceptionId,
        session.user.id,
        resolutionNote ?? "Resolved by administrator"
      );
      return apiResponse(exception, 200, "Reconciliation exception resolved.");
    }

    return apiResponse(null, 400, "Invalid review action.");
  },
  { roles: ["ADMIN"] }
);
