import { redis } from "@/lib/redis/client";

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "100", 10);

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  identifier: string,
  maxRequests = MAX_REQUESTS
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const resetAt = now + WINDOW_MS;

  if (redis) {
    try {
      const multi = redis.multi();
      multi.incr(key);
      multi.pttl(key);
      const results = await multi.exec();
      const count = (results?.[0]?.[1] as number) ?? 1;
      let ttl = (results?.[1]?.[1] as number) ?? -1;

      if (ttl === -1) {
        await redis.pexpire(key, WINDOW_MS);
        ttl = WINDOW_MS;
      }

      return {
        success: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetAt: now + ttl,
      };
    } catch {
      // Redis unavailable — fall back to in-memory limiter below.
    }
  }

  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: maxRequests - 1, resetAt };
  }

  entry.count += 1;
  return {
    success: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
