import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notifyAllAdminsInAppAndEmail } from "@/lib/services/verification-notifications";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FAILED_LOGIN_NOTIFY_WINDOW_MS = 60_000;

export function failedLoginWindowStart() {
  return new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
}

async function notifyAdminsOfFailedLogin(params: {
  email?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
}) {
  const email = params.email?.trim().toLowerCase();
  if (!email) return;

  const recentDuplicate = await prisma.loginLog.count({
    where: {
      success: false,
      createdAt: { gte: new Date(Date.now() - FAILED_LOGIN_NOTIFY_WINDOW_MS) },
      ...(params.userId ? { userId: params.userId } : { email }),
    },
  });

  if (recentDuplicate > 1) return;

  const ipSuffix = params.ipAddress ? ` from ${params.ipAddress}` : "";
  await notifyAllAdminsInAppAndEmail(
    "Failed login attempt",
    `Failed sign-in attempt for ${email}${ipSuffix}.`,
    { email, userId: params.userId ?? null, type: "FAILED_LOGIN" }
  );
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
  notifyAdmins?: boolean;
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

  const created = await createLoginLogResilient(attempts);

  if (created && params.notifyAdmins !== false) {
    try {
      await notifyAdminsOfFailedLogin({
        email,
        userId: params.userId ?? null,
        ipAddress: params.ipAddress ?? null,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[LoginLog] admin notification failed:", error);
      }
    }
  }

  return created;
}

async function syncFailedLoginLogsFromUsers(since?: Date) {
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

    const createdAt = user.updatedAt;

    for (let index = 0; index < missing; index += 1) {
      await recordFailedLoginAttempt({
        userId: user.id,
        email: user.email,
        createdAt,
        notifyAdmins: false,
      });
    }
  }
}

export async function countAllFailedLogins() {
  const fromLogs = await prisma.loginLog.count({
    where: { success: false },
  });

  if (fromLogs > 0) {
    return fromLogs;
  }

  const aggregate = await prisma.user.aggregate({
    _sum: { failedLoginCount: true },
    where: { failedLoginCount: { gt: 0 } },
  });

  return aggregate._sum.failedLoginCount ?? 0;
}

export async function countFailedLoginsLast24h() {
  const since = failedLoginWindowStart();

  const fromLogs = await prisma.loginLog.count({
    where: { success: false, createdAt: { gte: since } },
  });

  if (fromLogs > 0) {
    return fromLogs;
  }

  const aggregate = await prisma.user.aggregate({
    _sum: { failedLoginCount: true },
    where: {
      failedLoginCount: { gt: 0 },
      updatedAt: { gte: since },
    },
  });

  return aggregate._sum.failedLoginCount ?? 0;
}
