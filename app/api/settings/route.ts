import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { withProfileImageVersion } from "@/lib/utils/profile-image";
import { getProfileDisplayName } from "@/lib/utils/display-name";

export const GET = withAuth(async (_req: NextRequest, _ctx, session) => {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
      select: {
        email: true,
        image: true,
        updatedAt: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
      tenant: { select: { fullName: true, companyName: true, entityType: true } },
      landlord: { select: { fullName: true, companyName: true, entityType: true } },
      lender: { select: { fullName: true } },
      agentProfile: { select: { fullName: true } },
    },
  });

  const roleProfile =
    user?.tenant ?? user?.landlord ?? user?.lender ?? user?.agentProfile ?? null;
  const entityType =
    user?.tenant?.entityType ?? user?.landlord?.entityType ?? "INDIVIDUAL";
  const companyName = user?.tenant?.companyName ?? user?.landlord?.companyName ?? null;
  const fullName = getProfileDisplayName({
    entityType,
    fullName: roleProfile?.fullName ?? null,
    companyName,
  });

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse({
    user: user
      ? {
          email: user.email,
          image: withProfileImageVersion(user.image, user.updatedAt),
          role: user.role,
          fullName,
          emailVerified: Boolean(user.emailVerified),
          twoFactorEnabled: user.twoFactorEnabled,
        }
      : null,
    bankAccounts,
  });
});

export const PATCH = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const { imageUrl, currentPassword, newPassword } = body ?? {};

  if (imageUrl === undefined && !newPassword) {
    return apiResponse({ error: "No update data provided" }, 400);
  }

  const updates: Record<string, unknown> = {};
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
