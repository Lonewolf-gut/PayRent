import { getPlatformConfig } from "@/lib/services/platform-config.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    return apiResponse(getPlatformConfig());
  },
  { roles: ["ADMIN"] }
);
