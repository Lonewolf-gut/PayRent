import type { UserRole } from "@prisma/client";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  TENANT: [
    "property:read",
    "property:save",
    "application:create",
    "application:read",
    "financing:create",
    "financing:read",
    "mandate:create",
    "mandate:read",
    "kyc:manage",
    "wallet:read",
    "wallet:deposit",
    "wallet:withdraw",
    "wallet:pay",
    "message:send",
  ],
  LANDLORD: [
    "property:create",
    "property:update",
    "property:delete",
    "application:review",
    "agent:manage",
    "settlement:read",
    "wallet:read",
    "wallet:deposit",
    "wallet:withdraw",
    "kyc:manage",
    "subscription:manage",
    "message:send",
  ],
  AGENT: [
    "property:read",
    "property:update",
    "application:review",
    "kyc:manage",
    "wallet:read",
    "wallet:deposit",
    "wallet:withdraw",
    "subscription:manage",
    "message:send",
  ],
  LENDER: [
    "financing:review",
    "financing:approve",
    "financing:reject",
    "investment:read",
    "repayment:read",
    "wallet:read",
    "wallet:deposit",
    "wallet:withdraw",
    "kyc:manage",
    "message:send",
  ],
  ADMIN: [
    "admin:users",
    "admin:properties",
    "admin:transactions",
    "admin:kyc",
    "admin:mandates",
    "admin:settlements",
    "admin:reconciliation",
    "admin:subscriptions",
    "admin:commissions",
    "admin:fraud",
    "admin:disputes",
    "admin:analytics",
    "wallet:read",
    "wallet:withdraw",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requireRole(
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  TENANT: "/dashboard/tenant",
  LANDLORD: "/dashboard/landlord",
  AGENT: "/dashboard/agent",
  LENDER: "/dashboard/lender",
  ADMIN: "/admin",
};

export const SETTINGS_ROUTES: Record<UserRole, string> = {
  TENANT: "/dashboard/tenant/settings",
  LANDLORD: "/dashboard/landlord/settings",
  AGENT: "/dashboard/agent/settings",
  LENDER: "/dashboard/lender/settings",
  ADMIN: "/admin/settings",
};

export const SUBSCRIPTION_ROUTES: Record<UserRole, string> = {
  TENANT: "/pricing",
  LANDLORD: "/pricing",
  AGENT: "/pricing",
  LENDER: "/pricing",
  ADMIN: "/admin/settings",
};

export function getSubscriptionSettingsPath(role?: UserRole | null) {
  if (!role || role === "ADMIN") return "/register";
  return SUBSCRIPTION_ROUTES[role];
}

export const POST_LOGIN_ROUTES: Record<UserRole, string> = {
  TENANT: "/",
  LANDLORD: "/",
  AGENT: "/",
  LENDER: "/",
  ADMIN: "/admin",
};

export function getPostLoginRoute(role: UserRole) {
  return POST_LOGIN_ROUTES[role] ?? "/";
}

export const PLATFORM_ROLES: UserRole[] = [
  "TENANT",
  "LANDLORD",
  "AGENT",
  "LENDER",
  "ADMIN",
];
