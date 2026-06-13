import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (_req: NextRequest, _ctx, session) => {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, image: true },
  });

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse({ user, bankAccounts });
});

export const PATCH = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const { email, imageUrl, currentPassword, newPassword } = body ?? {};

  if (!email && !imageUrl && !newPassword) {
    return apiResponse({ error: "No update data provided" }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (email) updates.email = email;
  if (imageUrl !== undefined) updates.image = imageUrl || null;

  if (Object.keys(updates).length) {
    await prisma.user.update({ where: { id: session.user.id }, data: updates });
  }

  if (newPassword) {
    if (!currentPassword) {
      return apiResponse({ error: "Current password required" }, 400);
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return apiResponse({ error: "User not found" }, 404);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return apiResponse({ error: "Current password incorrect" }, 400);

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hash },
    });
  }

  return apiResponse({ updated: true });
});
