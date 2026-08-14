import { prisma } from "@/lib/db/prisma";
import {
  getAffiliatePlanLimits,
  getPlanLimits,
  getPropertyCategory,
  isUnlimitedPlan,
} from "@/lib/subscription-limits";
import { getSubscriptionAccess } from "@/lib/subscription/access";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const access = await getSubscriptionAccess(session.user.id);
    const isMarketer = session.user.role === "MARKETER";
    const unlimited = isMarketer
      ? isUnlimitedPlan(access.plan)
      : access.hasFullAccess || isUnlimitedPlan(access.plan);
    const limits = isMarketer
      ? getAffiliatePlanLimits(access.isPaid ? access.plan : "FREE")
      : getPlanLimits(access.isPaid ? access.plan : "FREE");

    const usage = { residential: 0, car: 0, appliance: 0, total: 0 };

    if (session.user.role === "MERCHANT") {
      const landlord = await prisma.landlord.findUnique({
        where: { userId: session.user.id },
      });

      if (landlord) {
        const existing = await prisma.property.findMany({
          where: { landlordId: landlord.id, status: { not: "INACTIVE" } },
          select: { propertyType: true },
        });

        usage.total = existing.length;
        for (const property of existing) {
          usage[getPropertyCategory(property.propertyType)] += 1;
        }
      }
    }

    if (session.user.role === "MARKETER") {
      const agent = await prisma.agentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (agent) {
        const existing = await prisma.property.findMany({
          where: { agentUserId: agent.id, status: { not: "INACTIVE" } },
          select: { propertyType: true },
        });

        usage.total = existing.length;
        for (const property of existing) {
          usage[getPropertyCategory(property.propertyType)] += 1;
        }
      }
    }

    return apiResponse({
      plan: access.plan,
      unlimited,
      trialActive: access.trialActive,
      trialEndsAt: access.trialEndsAt,
      hasFullAccess: access.hasFullAccess,
      usage,
      limits: unlimited
        ? {
            residential: null,
            cars: null,
            appliances: null,
            total: null,
          }
        : limits,
    });
  },
  { roles: ["MERCHANT", "MARKETER"] }
);
