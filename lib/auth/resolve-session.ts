import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import type { AppSession } from "@/lib/api/handler";

export async function resolveAppSession(req: NextRequest): Promise<AppSession | null> {
  const session = await auth();
  if (session?.user?.id && session.user.email) {
    return session as AppSession;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        image: true,
        twoFactorEnabled: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user?.isActive) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        image: user.image,
        twoFactorEnabled: user.twoFactorEnabled,
        emailVerified: Boolean(user.emailVerified),
      },
      expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    } as Session as AppSession;
  } catch {
    return null;
  }
}
