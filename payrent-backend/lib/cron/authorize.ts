import type { NextRequest } from "next/server";

export function authorizeCron(req: NextRequest) {
  if (process.env.NODE_ENV === "development") return true;

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  // Vercel Cron Jobs send this header on scheduled invocations.
  if (req.headers.get("x-vercel-cron") === "1") return true;

  return false;
}
