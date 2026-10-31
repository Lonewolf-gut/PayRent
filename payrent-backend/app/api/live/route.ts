import { NextResponse } from "next/server";

/** Instant liveness check — no database. Use before login to confirm port 3001 is up. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "payrent-backend",
    port: 3001,
  });
}
