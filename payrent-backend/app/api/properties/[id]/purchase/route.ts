import { apiResponse, withAuth } from "@/lib/api/handler";
import { propertyPurchaseService } from "@/lib/services/property-purchase.service";
import { AppError } from "@/lib/errors";
import { getReferralAgentProfileId } from "@/lib/utils/agent-referral-request";
import type { NextRequest } from "next/server";

export const POST = withAuth(
  async (req: NextRequest, context, session) => {
    const { id } = await context.params;
    const referredAgentProfileId = await getReferralAgentProfileId(req);
    try {
      const purchase = await propertyPurchaseService.purchase(
        session.user.id,
        id,
        referredAgentProfileId
      );
      return apiResponse(purchase, 201, "Purchase completed successfully.");
    } catch (error) {
      if (error instanceof AppError && error.code === "INSUFFICIENT_FUNDS") {
        return apiResponse(
          {
            error: error.message,
            code: "INSUFFICIENT_FUNDS",
            depositUrl: `/dashboard/buyer/wallet`,
          },
          400
        );
      }
      throw error;
    }
  },
  { roles: ["BUYER"] }
);
