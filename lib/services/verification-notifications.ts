import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { getProfileDisplayName } from "@/lib/utils/display-name";
import type { UserRole } from "@prisma/client";

const COMPLIANCE_ALERT_ROLES: UserRole[] = ["ADMIN", "COMPLIANCE_OFFICER"];

async function notifyRoleUsersInAppAndEmail(
  roles: UserRole[],
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  });

  if (!users.length) return;

  await Promise.all(
    users.map(async (user) => {
      await notificationService.create({
        userId: user.id,
        title,
        body,
        channel: "IN_APP",
        sendEmail: false,
        metadata,
      });
      await notificationService.deliverEmail(user.id, title, body);
    })
  );
}

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
  return notifyRoleUsersInAppAndEmail(COMPLIANCE_ALERT_ROLES, title, body, metadata);
}

export async function notifyAllComplianceOfficersInAppAndEmail(
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  return notifyRoleUsersInAppAndEmail(["COMPLIANCE_OFFICER"], title, body, metadata);
}

export async function notifyComplianceEvent(
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  return notifyAllComplianceOfficersInAppAndEmail(title, body, metadata);
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
    BUYER: "Buyer",
    MERCHANT: "Merchant",
    MARKETER: "Affiliate",
    LENDER: "Investor",
    ADMIN: "Admin",
    COMPLIANCE_OFFICER: "Compliance Officer",
  };
  return labels[role] ?? role;
}
