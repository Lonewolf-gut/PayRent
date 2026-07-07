import type { UserRole } from "@prisma/client";

export const MESSAGES_ROUTES: Partial<Record<UserRole, string>> = {
  TENANT: "/dashboard/tenant/messages",
  LANDLORD: "/dashboard/landlord/messages",
  AGENT: "/dashboard/agent/messages",
  LENDER: "/dashboard/lender/messages",
};

export const WALLET_ROUTES: Partial<Record<UserRole, string>> = {
  TENANT: "/dashboard/tenant/wallet",
  LANDLORD: "/dashboard/landlord/wallet",
  AGENT: "/dashboard/agent/wallet",
  LENDER: "/dashboard/lender/wallet",
};

export const SAVED_ROUTES: Partial<Record<UserRole, string>> = {
  TENANT: "/dashboard/tenant/properties",
};

export function getMessagesPath(role?: UserRole | string | null) {
  if (!role) return "/login";
  return MESSAGES_ROUTES[role as UserRole] ?? "/dashboard";
}

export function getWalletPath(role?: UserRole | string | null) {
  if (!role) return "/login";
  return WALLET_ROUTES[role as UserRole] ?? "/dashboard";
}

export function getSavedPath(role?: UserRole | string | null) {
  if (!role) return "/login";
  return SAVED_ROUTES[role as UserRole] ?? null;
}
