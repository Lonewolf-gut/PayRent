import { kycService } from "@/lib/services/kyc.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const reviews = await kycService.getPendingKycReviews();
    return apiResponse(reviews, 200, "KYC review queue retrieved.");
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:kyc" }
);
