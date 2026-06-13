import { analyticsService } from "@/lib/services/analytics.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const data = await analyticsService.getCeoDashboard();
    return apiResponse(data);
  },
  { roles: ["ADMIN"], permission: "ceo:analytics" }
);
