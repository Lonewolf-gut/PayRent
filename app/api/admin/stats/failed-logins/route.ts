import { countFailedLoginsLast24h } from "@/lib/admin/failed-login-stats";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const failedLogins = await countFailedLoginsLast24h();
    return apiResponse({ failedLogins });
  },
  { roles: ["ADMIN"] }
);
