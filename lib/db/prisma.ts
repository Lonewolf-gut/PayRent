import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaHealthCheckedAt?: number;
  prismaPoolWarningShown?: boolean;
};

function warnIfDatabasePoolMisconfigured() {
  if (globalForPrisma.prismaPoolWarningShown) return;
  globalForPrisma.prismaPoolWarningShown = true;

  const url = process.env.DATABASE_URL ?? "";
  if (!url) return;

  try {
    const parsed = new URL(url);
    const limit = parsed.searchParams.get("connection_limit");
    const port = parsed.searchParams.get("port") ?? parsed.port;
    const host = parsed.hostname;
    const isSupabasePooler = host.includes("pooler.supabase.com");
    const isTransactionPooler = port === "6543";
    const hasPgBouncer = parsed.searchParams.get("pgbouncer") === "true";

    if (limit === "1") {
      console.warn(
        "[database] DATABASE_URL sets connection_limit=1. Parallel API calls will time out (P2024). " +
          "Remove connection_limit=1 from .env, or set connection_limit=5 for local backend dev."
      );
    }

    if (isSupabasePooler && !isTransactionPooler) {
      console.warn(
        "[database] Supabase pooler on port 5432 (session mode) is easy to exhaust under parallel load. " +
          "Prefer transaction pooler port 6543 with pgbouncer=true in DATABASE_URL."
      );
    }

    if (isSupabasePooler && isTransactionPooler && !hasPgBouncer) {
      console.warn(
        "[database] Supabase transaction pooler (6543) should include pgbouncer=true for Prisma."
      );
    }
  } catch {
    // ignore malformed URLs — Prisma will surface the error later
  }
}

function createPrismaClient() {
  warnIfDatabasePoolMisconfigured();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export async function runTransaction<T>(
  fn: (db: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction((tx) => fn(tx as PrismaClient));
}

const HEALTH_CHECK_TTL_MS = 30_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lightweight health check before API handlers run.
 * Cached briefly so parallel admin dashboard requests do not each grab a DB connection.
 * Never disconnects the shared client — that breaks concurrent requests under pool limits.
 */
export async function ensureDbConnection(retries = 3): Promise<void> {
  const now = Date.now();
  if (
    globalForPrisma.prismaHealthCheckedAt &&
    now - globalForPrisma.prismaHealthCheckedAt < HEALTH_CHECK_TTL_MS
  ) {
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      globalForPrisma.prismaHealthCheckedAt = Date.now();
      return;
    } catch (error) {
      if (attempt === retries) {
        globalForPrisma.prismaHealthCheckedAt = undefined;
        throw error;
      }
      await sleep(Math.min(attempt * 500, 2000));
    }
  }
}
