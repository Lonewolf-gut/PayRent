import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { getBusinessRules } from "@/lib/services/business-rules.service";
import { getSubscriptionAccess } from "@/lib/subscription/access";
import { isPaidPlan } from "@/lib/subscription/plans";

export async function countLenderFinancedProperties(lenderId: string) {
  return prisma.investment.count({
    where: { lenderId },
  });
}

export async function assertLenderCanFinanceMore(
  lenderId: string,
  lenderUserId: string
) {
  const access = await getSubscriptionAccess(lenderUserId);
  if (isPaidPlan(access.plan)) return;

  const [rules, financedCount] = await Promise.all([
    getBusinessRules(),
    countLenderFinancedProperties(lenderId),
  ]);

  if (financedCount >= rules.lenderFreeFinancingLimit) {
    throw new AppError(
      `Free lenders can finance up to ${rules.lenderFreeFinancingLimit} properties. Subscribe at /pricing for unlimited financing access.`,
      403,
      "LENDER_FINANCING_LIMIT"
    );
  }
}

export async function getLenderFinancingAccess(lenderUserId: string) {
  const access = await getSubscriptionAccess(lenderUserId);
  const rules = await getBusinessRules();
  const lender = await prisma.lender.findUnique({
    where: { userId: lenderUserId },
    select: { id: true },
  });

  const financedCount = lender
    ? await countLenderFinancedProperties(lender.id)
    : 0;

  const limit = isPaidPlan(access.plan) ? null : rules.lenderFreeFinancingLimit;

  return {
    plan: access.plan,
    isPaid: access.isPaid,
    financedCount,
    limit,
    remaining: limit == null ? null : Math.max(0, limit - financedCount),
    requiresSubscription: limit != null && financedCount >= limit,
  };
}
