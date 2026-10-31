import { NextRequest } from "next/server";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { agentPropertyService } from "@/lib/services/agent-property.service";
import { getSubscriptionAccess } from "@/lib/subscription/access";

export const GET = withAuth(
  async (_req: NextRequest, _ctx, session) => {
    const [listings, access] = await Promise.all([
      agentPropertyService.browseAvailable(session.user.id),
      getSubscriptionAccess(session.user.id),
    ]);

    const canPromote = access.hasFullAccess;

    return apiResponse({
      listings,
      promotionAccess: {
        canPromote,
        message: canPromote
          ? null
          : "Your trial has ended. Upgrade to a paid plan to promote listings.",
      },
    });
  },
  { roles: ["MARKETER"] }
);
