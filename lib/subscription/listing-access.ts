import type { PropertyType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import {
  getPlanLimits,
  getPropertyCategory,
} from "@/lib/subscription-limits";
import { getSubscriptionAccess, TRIAL_DAYS } from "@/lib/subscription/access";

export async function assertAgentAssignmentLimit(agentUserId: string) {
  const access = await getSubscriptionAccess(agentUserId);

  if (access.trialExpired && !access.isPaid) {
    throw new AppError(
      `This agent's ${TRIAL_DAYS}-day trial has ended. They must upgrade at /pricing before accepting new listing assignments.`,
      403,
      "TRIAL_EXPIRED"
    );
  }

  if (access.hasFullAccess) return;

  const agent = await prisma.agentProfile.findUnique({
    where: { userId: agentUserId },
    select: { id: true },
  });
  if (!agent) {
    throw new AppError("Agent profile required", 403);
  }

  const limits = getPlanLimits(access.plan);
  if (!limits) return;

  const existing = await prisma.property.findMany({
    where: {
      agentUserId: agent.id,
      status: { not: "INACTIVE" },
    },
    select: { propertyType: true },
  });

  const counts = {
    residential: 0,
    car: 0,
    appliance: 0,
    total: existing.length,
  };

  for (const property of existing) {
    counts[getPropertyCategory(property.propertyType)] += 1;
  }

  const tierLabel = access.plan === "PRO" ? "Pro" : "Free";

  if (counts.total >= limits.total) {
    throw new AppError(
      `This agent has reached their ${tierLabel} plan limit of ${limits.total} assigned listings. Ask them to upgrade for more capacity.`,
      403
    );
  }
}

export async function assertLandlordListingLimit(
  userId: string,
  propertyType: PropertyType
) {
  const access = await getSubscriptionAccess(userId);
  if (access.trialExpired && !access.isPaid) {
    throw new AppError(
      `Your ${TRIAL_DAYS}-day trial has ended. Upgrade at /pricing to add or restore listings.`,
      403,
      "TRIAL_EXPIRED"
    );
  }
  if (access.hasFullAccess) return;

  const limits = getPlanLimits(access.plan);
  if (!limits) return;

  const landlord = await prisma.landlord.findUnique({ where: { userId } });
  if (!landlord) throw new AppError("Landlord profile required", 403);

  const existing = await prisma.property.findMany({
    where: { landlordId: landlord.id, status: { not: "INACTIVE" } },
    select: { propertyType: true },
  });

  const counts = {
    residential: 0,
    car: 0,
    appliance: 0,
    total: existing.length,
  };

  for (const property of existing) {
    counts[getPropertyCategory(property.propertyType)] += 1;
  }

  const tierLabel = access.plan === "PRO" ? "Pro" : "Free";

  if (counts.total >= limits.total) {
    throw new AppError(
      `${tierLabel} plan limit reached: maximum ${limits.total} total listings. Upgrade your plan for more access.`,
      403
    );
  }

  const category = getPropertyCategory(propertyType);
  if (category === "residential" && counts.residential >= limits.residential) {
    throw new AppError(
      `${tierLabel} plan limit reached: maximum ${limits.residential} property listings. Upgrade your plan for more access.`,
      403
    );
  }
  if (category === "car" && counts.car >= limits.cars) {
    throw new AppError(
      `${tierLabel} plan limit reached: maximum ${limits.cars} car listings. Upgrade your plan for more access.`,
      403
    );
  }
  if (category === "appliance" && counts.appliance >= limits.appliances) {
    throw new AppError(
      `${tierLabel} plan limit reached: maximum ${limits.appliances} appliance listings. Upgrade your plan for more access.`,
      403
    );
  }
}
