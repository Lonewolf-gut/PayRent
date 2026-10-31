import { PrismaClient } from "@prisma/client";
import { getRuntimeDatabaseUrl } from "@/lib/db/database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = getRuntimeDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set in the environment.");
  }

  return new PrismaClient({
    datasources: { db: { url } },
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

export async function runTransaction<T>(
  fn: (db: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction((tx) => fn(tx as PrismaClient));
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry DB connect (local Docker cold start or transient Supabase/network blips). */
export async function ensureDbConnection(retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch {
      try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await sleep(Math.min(attempt * 800, 2000));
      }
    }
  }
}
