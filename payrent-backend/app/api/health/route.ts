import { NextResponse } from "next/server";
import {
  getDatabaseUnavailableHint,
  getRawDatabaseUrl,
  isSupabaseDatabaseUrl,
} from "@/lib/db/database-url";
import { ensureDbConnection } from "@/lib/db/prisma";
import { redis } from "@/lib/redis/client";

function describeDatabaseTarget(): string | undefined {
  const raw = getRawDatabaseUrl();
  if (!raw) return undefined;
  try {
    const normalized = raw.replace(/^postgresql:/, "postgres:");
    const u = new URL(normalized);
    return `${u.hostname}:${u.port || "5432"}`;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const hints: string[] = [];

  if (isSupabaseDatabaseUrl() && !process.env.DIRECT_URL?.trim()) {
    hints.push(
      "Supabase: set DIRECT_URL to the direct connection string (port 5432) in .env — required for Prisma alongside the pooler DATABASE_URL."
    );
  }

  if (!getRawDatabaseUrl()) {
    hints.push("DATABASE_URL is missing from the backend environment.");
  }

  let postgres = false;
  let redisOk = false;

  try {
    await ensureDbConnection();
    postgres = true;
  } catch {
    hints.push(getDatabaseUnavailableHint());
  }

  if (redis) {
    try {
      const ping = Promise.race([
        (async () => {
          if (redis.status === "wait") {
            await redis.connect();
          }
          return (await redis.ping()) === "PONG";
        })(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2_000)),
      ]);
      redisOk = await ping;
    } catch {
      hints.push(
        "Redis is optional for sign-in. Set REDIS_URL or use Upstash; local dev: docker compose up -d redis"
      );
    }
  } else {
    redisOk = true;
  }

  const body = {
    ok: postgres,
    postgres,
    redis: redisOk,
    hints,
  };

  return NextResponse.json(body, { status: postgres ? 200 : 503 });
}
