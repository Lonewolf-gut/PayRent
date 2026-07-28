import { getLenderFinancingAccess } from "@/lib/subscription/lender-access";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const access = await getLenderFinancingAccess(session.user.id);
    return apiResponse(access);
  },
  { roles: ["LENDER"], permission: "financing:review" }
);
