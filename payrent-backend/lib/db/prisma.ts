import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient();
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

/** Retry DB connect on cold Docker Desktop / dropped connections. */
export async function ensureDbConnection(retries = 5): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore disconnect errors
      }

      try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await sleep(Math.min(attempt * 1500, 5000));
      }
    }
  }
}
