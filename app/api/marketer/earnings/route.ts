import { NextRequest } from "next/server";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { agentCommissionService } from "@/lib/services/agent-commission.service";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(
  async (_req: NextRequest, _ctx, session) => {
    const agent = await prisma.agentProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!agent) return apiResponse({ error: "Agent profile required" }, 403);

    const data = await agentCommissionService.listEarnings(agent.id);
    return apiResponse(data);
  },
  { roles: ["MARKETER"] }
);
