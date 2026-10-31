import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
  redisErrorLogged?: boolean;
};

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 5_000,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 500, 2_000);
    },
  });

  client.on("error", (error) => {
    if (!globalForRedis.redisErrorLogged) {
      globalForRedis.redisErrorLogged = true;
      console.warn(
        "[redis] Connection failed — cache and rate limits use in-memory fallback.",
        error instanceof Error ? error.message : error
      );
      console.warn(
        "[redis] Start Redis with: docker compose up redis -d"
      );
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

async function withRedis<T>(operation: (client: Redis) => Promise<T>): Promise<T | null> {
  if (!redis) return null;
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    return await operation(redis);
  } catch {
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await withRedis((client) => client.get(key));
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  await withRedis((client) =>
    client.setex(key, ttlSeconds, JSON.stringify(value))
  );
}

export async function cacheDel(key: string): Promise<void> {
  await withRedis((client) => client.del(key));
}
