import type { UserRole } from "@prisma/client";

export type AdminUsersFilter = {
  role?: UserRole | null;
  search?: string | null;
};

export function buildAdminUsersWhere({ role, search }: AdminUsersFilter) {
  const trimmedSearch = search?.trim();
  return {
    ...(role ? { role } : {}),
    ...(trimmedSearch
      ? {
          email: { contains: trimmedSearch, mode: "insensitive" as const },
        }
      : {}),
  };
}

export const ADMIN_USER_EXPORT_SELECT = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  lockedUntil: true,
  failedLoginCount: true,
  createdAt: true,
} as const;

export type AdminUserExportRow = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lockedUntil: Date | null;
  failedLoginCount: number;
  createdAt: Date;
};

export function formatUserStatus(user: AdminUserExportRow) {
  const parts = [user.isActive ? "Active" : "Suspended"];
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    parts.push("Locked");
  }
  return parts.join(" · ");
}

export function usersToCsvRows(users: AdminUserExportRow[]) {
  const header = ["Email", "Role", "Status", "Failed logins", "Joined"];
  const rows = users.map((user) => [
    user.email,
    user.role,
    formatUserStatus(user),
    String(user.failedLoginCount),
    new Date(user.createdAt).toLocaleDateString(),
  ]);
  return [header, ...rows];
}

export function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function usersToCsv(users: AdminUserExportRow[]) {
  const bom = "\uFEFF";
  const lines = usersToCsvRows(users).map((row) =>
    row.map((cell) => escapeCsvCell(cell)).join(",")
  );
  return bom + lines.join("\r\n");
}
