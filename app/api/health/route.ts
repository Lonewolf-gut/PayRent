import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/redis/client";

export async function GET() {
  const hints: string[] = [];
  let postgres = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    postgres = true;
  } catch {
    hints.push(
      "Postgres is not reachable. Open Docker Desktop, then run: npm run bring-up"
    );
  }

  if (redis) {
    try {
      if (redis.status === "wait") {
        await redis.connect();
      }
      redisOk = (await redis.ping()) === "PONG";
    } catch {
      hints.push("Redis is not reachable. Run: docker compose up -d redis");
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
