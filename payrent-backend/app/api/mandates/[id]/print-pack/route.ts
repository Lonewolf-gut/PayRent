import { mandateService } from "@/lib/services/mandate.service";
import { apiError, apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (_req, ctx) => {
    const { id: mandateId } = await ctx.params;
    if (!mandateId) {
      return apiResponse(null, 400, "Mandate id required.");
    }

    try {
      const pack = await mandateService.getAdminPrintPack(mandateId);
      return apiResponse(pack, 200, "Mandate print pack retrieved.");
    } catch (error) {
      return apiError(error);
    }
  },
  { roles: ["ADMIN"] }
);
