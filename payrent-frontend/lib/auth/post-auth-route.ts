import type { UserRole } from "@prisma/client";
import { getPostLoginRoute, isStaffRole } from "@/lib/auth/permissions";

export function requiresPhoneVerification(role: UserRole) {
  return !isStaffRole(role);
}

export function getPostAuthRoute(params: {
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
}) {
  if (!params.emailVerified && params.role !== "ADMIN") {
    return "/verify-email";
  }

  if (
    requiresPhoneVerification(params.role) &&
    !params.phoneVerified
  ) {
    return "/verify-phone";
  }

  return getPostLoginRoute(params.role);
}
