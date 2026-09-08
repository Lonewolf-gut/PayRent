import type { UserRole } from "@prisma/client";
import { getPostLoginRoute, isStaffRole } from "@/lib/auth/permissions";
import {
  sanitizeCallbackUrl,
  shouldHonorCallbackForRole,
} from "@/lib/utils/auth-callback-url";

export function requiresPhoneVerification(role: UserRole) {
  return !isStaffRole(role);
}

export function getPostAuthRoute(params: {
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  returnUrl?: string | null;
}) {
  const returnUrl = sanitizeCallbackUrl(params.returnUrl ?? null);

  if (!params.emailVerified && params.role !== "ADMIN") {
    return returnUrl
      ? `/verify-email?callbackUrl=${encodeURIComponent(returnUrl)}`
      : "/verify-email";
  }

  if (requiresPhoneVerification(params.role) && !params.phoneVerified) {
    return returnUrl
      ? `/verify-phone?callbackUrl=${encodeURIComponent(returnUrl)}`
      : "/verify-phone";
  }

  if (params.role === "BUYER") {
    return "/properties";
  }

  if (params.role === "MARKETER") {
    if (returnUrl?.startsWith("/dashboard/marketer")) {
      return returnUrl;
    }
    return "/dashboard/marketer/promote";
  }

  if (params.role === "MERCHANT") {
    if (returnUrl?.startsWith("/dashboard/merchant")) {
      return returnUrl;
    }
    return "/dashboard/merchant/properties";
  }

  if (returnUrl && shouldHonorCallbackForRole(params.role, returnUrl)) {
    return returnUrl;
  }

  return getPostLoginRoute(params.role);
}
