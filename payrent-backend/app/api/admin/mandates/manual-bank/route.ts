import { mandateService } from "@/lib/services/mandate.service";
import { apiError, apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    try {
      const mandates = await mandateService.listManualBankPendingReview();
      return apiResponse(
        { items: mandates, total: mandates.length },
        200,
        "Manual bank mandate queue retrieved."
      );
    } catch (error) {
      return apiError(error);
    }
  },
  { roles: ["ADMIN"], permission: "admin:mandates" }
);
