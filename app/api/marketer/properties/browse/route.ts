import { NextRequest } from "next/server";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { agentPropertyService } from "@/lib/services/agent-property.service";

export const GET = withAuth(
  async (_req: NextRequest, _ctx, session) => {
    const listings = await agentPropertyService.browseAvailable(session.user.id);
    return apiResponse(listings);
  },
  { roles: ["MARKETER"] }
);
