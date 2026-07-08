import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function failedLoginWindowStart() {
  return new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
}

async function createLoginLogResilient(
  attempts: Prisma.LoginLogCreateInput[]
) {
  for (const data of attempts) {
    try {
      return await prisma.loginLog.create({ data });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[LoginLog] create failed:", error);
      }
    }
  }

  return null;
}

export async function recordFailedLoginAttempt(params: {
  userId?: string | null;
  email?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}) {
  const email = params.email?.trim().toLowerCase();
  const base = {
    success: false as const,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    createdAt: params.createdAt,
    email: email ?? null,
  };

  const attempts: Prisma.LoginLogCreateInput[] = params.userId
    ? [
        { ...base, user: { connect: { id: params.userId } } },
        {
          success: false,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          createdAt: params.createdAt,
          user: { connect: { id: params.userId } },
        },
      ]
    : [base, { success: false, createdAt: params.createdAt }];

  return createLoginLogResilient(attempts);
}

async function syncFailedLoginLogsFromUsers(since: Date) {
  const users = await prisma.user.findMany({
    where: { failedLoginCount: { gt: 0 } },
    select: {
      id: true,
      email: true,
      failedLoginCount: true,
      updatedAt: true,
    },
  });

  for (const user of users) {
    const existingFailed = await prisma.loginLog.count({
      where: { userId: user.id, success: false },
    });

    const missing = user.failedLoginCount - existingFailed;
    if (missing <= 0) continue;

    const createdAt = user.updatedAt >= since ? user.updatedAt : new Date();

    for (let index = 0; index < missing; index += 1) {
      await recordFailedLoginAttempt({
        userId: user.id,
        email: user.email,
        createdAt,
      });
    }
  }
}

export async function countFailedLoginsLast24h() {
  const since = failedLoginWindowStart();

  await syncFailedLoginLogsFromUsers(since);

  const fromLogs = await prisma.loginLog.count({
    where: { success: false, createdAt: { gte: since } },
  });

  if (fromLogs > 0) {
    return fromLogs;
  }

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
