import { NextRequest } from "next/server";
import { createApplicationSchema } from "@/lib/validations/application";
import { applicationService } from "@/lib/services/application.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { getReferralAgentProfileId } from "@/lib/utils/agent-referral-request";

export const GET = withAuth(
  async (_req: NextRequest, _ctx, session) => {
    if (session.user.role === "BUYER") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      if (!tenant) return apiResponse([]);
      const apps = await applicationService.listForTenant(tenant.id);
      return apiResponse(apps, 200, "Applications retrieved.");
    }

    if (session.user.role === "MERCHANT") {
      const landlord = await prisma.landlord.findUnique({
        where: { userId: session.user.id },
      });
      if (!landlord) return apiResponse([]);
      const apps = await applicationService.listForLandlord(landlord.id);
      return apiResponse(apps, 200, "Applications retrieved.");
    }

    if (session.user.role === "MARKETER") {
      const agent = await prisma.agentProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!agent) return apiResponse([]);
      const apps = await applicationService.listForAgent(agent.id);
      return apiResponse(apps, 200, "Applications retrieved.");
    }

    return apiResponse([]);
  },
  { roles: ["BUYER", "MERCHANT", "MARKETER"] }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse(null, 400, "Validation failed.");
    }

    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });
    if (!tenant) return apiResponse(null, 403, "Tenant profile required.");

    const referredAgentProfileId = await getReferralAgentProfileId(req);

    const application = await applicationService.create(
      tenant.id,
      session.user.id,
      parsed.data,
      referredAgentProfileId
    );

    return apiResponse(application, 201, "Application submitted.");
  },
  { roles: ["BUYER"], permission: "application:create" }
);
