import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { getProfileDisplayName } from "@/lib/utils/display-name";
import type { UserRole } from "@prisma/client";

export async function notifyUserInAppAndEmail(
  userId: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  await notificationService.create({
    userId,
    title,
    body,
    channel: "IN_APP",
    sendEmail: false,
    metadata,
  });
  await notificationService.deliverEmail(userId, title, body);
}

export async function notifyAllAdminsInAppAndEmail(
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (!admins.length) return;

  await Promise.all(
    admins.map(async (admin: { id: string }) => {
      await notificationService.create({
        userId: admin.id,
        title,
        body,
        channel: "IN_APP",
        sendEmail: false,
        metadata,
      });
      await notificationService.deliverEmail(admin.id, title, body);
    })
  );
}

export async function getUserDisplayName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      tenant: { select: { fullName: true, companyName: true, entityType: true } },
      landlord: { select: { fullName: true, companyName: true, entityType: true } },
      lender: { select: { fullName: true } },
      agentProfile: { select: { fullName: true } },
    },
  });

  if (!user) return "User";

  const roleProfile = user.tenant ?? user.landlord ?? user.lender ?? user.agentProfile;
  const entityType = user.tenant?.entityType ?? user.landlord?.entityType ?? "INDIVIDUAL";
  const companyName = user.tenant?.companyName ?? user.landlord?.companyName ?? null;

  return (
    getProfileDisplayName({
      entityType,
      fullName: roleProfile?.fullName ?? null,
      companyName,
    }) ?? user.email
  );
}

export function formatRoleLabel(role: UserRole | string) {
  const labels: Record<string, string> = {
    TENANT: "Tenant",
    LANDLORD: "Landlord",
    AGENT: "Agent",
    LENDER: "Investor",
    ADMIN: "Admin",
  };
  return labels[role] ?? role;
}
