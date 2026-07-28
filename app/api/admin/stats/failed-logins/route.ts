import { countAllFailedLogins } from "@/lib/admin/failed-login-stats";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const failedLogins = await countAllFailedLogins();
    return apiResponse({ failedLogins });
  },
  { roles: ["ADMIN"] }
);
