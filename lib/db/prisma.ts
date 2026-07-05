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

let connectPromise: Promise<void> | undefined;

/** Retry DB connect on cold Docker Desktop / Windows networking. */
export async function ensureDbConnection(retries = 3): Promise<void> {
  if (!connectPromise) {
    connectPromise = (async () => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await prisma.$connect();
          return;
        } catch (error) {
          if (attempt === retries) {
            connectPromise = undefined;
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        }
      }
    })();
  }

  return connectPromise;
}
