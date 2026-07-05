import { apiResponse, withAuth } from "@/lib/api/handler";
import { propertyPurchaseService } from "@/lib/services/property-purchase.service";
import { AppError } from "@/lib/errors";

export const POST = withAuth(
  async (_req, context, session) => {
    const { id } = await context.params;
    try {
      const purchase = await propertyPurchaseService.purchase(session.user.id, id);
      return apiResponse(purchase, 201, "Purchase completed successfully.");
    } catch (error) {
      if (error instanceof AppError && error.code === "INSUFFICIENT_FUNDS") {
        return apiResponse(
          {
            error: error.message,
            code: "INSUFFICIENT_FUNDS",
            depositUrl: `/dashboard/tenant/wallet`,
          },
          400
        );
      }
      throw error;
    }
  },
  { roles: ["TENANT"] }
);
