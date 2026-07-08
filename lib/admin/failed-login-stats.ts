import { prisma } from "@/lib/db/prisma";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function failedLoginWindowStart() {
  return new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
}

export async function countFailedLoginsLast24h() {
  const since = failedLoginWindowStart();

  const fromLogs = await prisma.loginLog.count({
    where: { success: false, createdAt: { gte: since } },
  });

  if (fromLogs > 0) {
    return fromLogs;
  }

  // Fallback for attempts recorded on the user record when LoginLog writes failed.
  const usersWithRecentFailures = await prisma.user.findMany({
    where: {
      failedLoginCount: { gt: 0 },
      updatedAt: { gte: since },
    },
    select: { failedLoginCount: true },
  });

  return usersWithRecentFailures.reduce(
    (total, user) => total + user.failedLoginCount,
    0
  );
}
