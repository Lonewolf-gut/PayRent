import { NextRequest } from "next/server";
import { kycService } from "@/lib/services/kyc.service";
import { apiError, apiResponse, withAuth, type RouteContext } from "@/lib/api/handler";

export const DELETE = withAuth(
  async (_req: NextRequest, context: RouteContext, session) => {
    try {
      const { id } = await context.params;
      const result = await kycService.deleteBankAccount(session.user.id, id);
      return apiResponse(result, 200, "Account removed.");
    } catch (error) {
      return apiError(error);
    }
  },
  { roles: ["ADMIN"] }
);
