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

function isDbConnectivityError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";

  return (
    code === "P1001" ||
    code === "P1017" ||
    message.includes("Engine is not yet connected") ||
    message.includes("Can't reach database server") ||
    message.includes("Connection refused") ||
    message.includes("ECONNREFUSED")
  );
}

let connectPromise: Promise<void> | null = null;

/** Retry DB connect on cold Docker Desktop / dropped connections. */
export async function ensureDbConnection(retries = 5): Promise<void> {
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // $connect is idempotent; never $disconnect the shared dev singleton.
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        lastError = error;
        if (attempt === retries) break;
        await sleep(Math.min(attempt * 1500, 5000));
      }
    }

    throw lastError;
  })();

  try {
    await connectPromise;
  } finally {
    connectPromise = null;
  }
}

export { isDbConnectivityError };
