import { payoutBankConfigService } from "@/lib/services/payout-bank-config.service";
import { apiError, apiResponse, withAuth } from "@/lib/api/handler";
import type { RouteContext } from "@/lib/api/handler";

export const DELETE = withAuth(
  async (_req, context: RouteContext) => {
    const { id } = await context.params;
    try {
      await payoutBankConfigService.remove(id);
      return apiResponse({ id }, 200, "Payout bank removed.");
    } catch (error) {
      return apiError(error);
    }
  },
  { roles: ["ADMIN"], permission: "admin:fees" }
);
