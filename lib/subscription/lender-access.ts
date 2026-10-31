import { prisma } from "@/lib/db/prisma";

export async function countLenderFinancedProperties(lenderId: string) {
  return prisma.investment.count({
    where: { lenderId },
  });
}

export async function assertLenderCanFinanceMore(
  _lenderId: string,
  _lenderUserId: string
) {
  // Lenders are not capped by subscription tier or financed-property counts.
}

export async function getLenderFinancingAccess(lenderUserId: string) {
  const lender = await prisma.lender.findUnique({
    where: { userId: lenderUserId },
    select: { id: true },
  });

  const financedCount = lender
    ? await countLenderFinancedProperties(lender.id)
    : 0;

  return {
    plan: null,
    isPaid: true,
    financedCount,
    limit: null,
    remaining: null,
    requiresSubscription: false,
  };
}
