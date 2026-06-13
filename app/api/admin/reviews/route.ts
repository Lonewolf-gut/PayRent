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

    if (type === "reconciliation") {
      const exceptions = await settlementService.listReconciliationExceptions();
      return apiResponse(exceptions, 200, "Reconciliation exceptions retrieved.");
    }

    return apiResponse([], 200, "Review queue retrieved.");
  },
  { roles: ["ADMIN", "CEO"] }
);

export const PATCH = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const { bankAccountId, exceptionId, resolutionNote } = body;

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
  { roles: ["ADMIN", "CEO"] }
);
