import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { recordFailedLoginAttempt } from "@/lib/admin/failed-login-stats";
import { apiResponse, withPublicHandler } from "@/lib/api/handler";

const bodySchema = z.object({
  email: z.string().email(),
});

export const POST = withPublicHandler(async (req: NextRequest) => {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return apiResponse({ recorded: false }, 400, "Invalid login attempt payload");
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const recentDuplicate = await prisma.loginLog.count({
    where: {
      success: false,
      createdAt: { gte: new Date(Date.now() - 60_000) },
      ...(user?.id ? { userId: user.id } : { email }),
    },
  });

  if (recentDuplicate > 0) {
    return apiResponse({ recorded: false, reason: "duplicate" });
  }

  await recordFailedLoginAttempt({
    userId: user?.id ?? null,
    email,
    ipAddress: ip,
    userAgent,
  });

  return apiResponse({ recorded: true });
});
