import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { loadSubscriptionAccess, TRIAL_DAYS } from "@/lib/subscription/access";
import { isPaidPlan, normalizeSubscriptionPlan } from "@/lib/subscription/plans";

export async function suspendListingsAfterTrial(userId: string) {
  const access = await loadSubscriptionAccess(userId);
  if (access.hasFullAccess) {
    return { suspended: 0 };
  }

  const landlord = await prisma.landlord.findUnique({ where: { userId } });
  if (!landlord) return { suspended: 0 };

  const result = await prisma.property.updateMany({
    where: {
      landlordId: landlord.id,
      status: { in: ["ACTIVE", "RENTED"] },
    },
    data: { status: "TRIAL_SUSPENDED" },
  });

  return { suspended: result.count };
}

export async function reactivateTrialSuspendedListings(userId: string) {
  const landlord = await prisma.landlord.findUnique({ where: { userId } });
  if (!landlord) return { reactivated: 0 };

  const result = await prisma.property.updateMany({
    where: {
      landlordId: landlord.id,
      status: "TRIAL_SUSPENDED",
    },
    data: { status: "ACTIVE" },
  });

  return { reactivated: result.count };
}

export async function processExpiredTrials() {
  const now = new Date();
  const legacyCutoff = new Date(now);
  legacyCutoff.setDate(legacyCutoff.getDate() - TRIAL_DAYS);

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["MERCHANT", "MARKETER"] },
      OR: [
        { trialEndsAt: { lte: now } },
        { trialEndsAt: null, createdAt: { lte: legacyCutoff } },
      ],
    },
    select: {
      id: true,
      trialEndsAt: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { plan: true },
      },
    },
  });

  let processed = 0;
  let suspendedListings = 0;

  for (const user of users) {
    const plan = normalizeSubscriptionPlan(user.subscriptions[0]?.plan ?? "FREE");
    if (isPaidPlan(plan)) continue;

    const { suspended } = await suspendListingsAfterTrial(user.id);
    if (suspended > 0) {
      suspendedListings += suspended;
      await notificationService.create({
        userId: user.id,
        title: "Trial ended — listings hidden",
        body: `Your ${TRIAL_DAYS}-day trial has ended. Upgrade at /pricing to restore ${suspended} listing(s) and unlock full platform access.`,
        channel: "EMAIL",
        sendEmail: true,
      });
    }

    processed += 1;
  }

  return { processed, suspendedListings };
}
