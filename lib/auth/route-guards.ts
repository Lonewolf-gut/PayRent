export const MARKETING_ROUTE_PREFIXES = [
  "/properties",
  "/pricing",
  "/contact",
  "/faq",
  "/terms",
  "/privacy",
  "/roles",
] as const;

export function isMarketingPath(pathname: string) {
  if (pathname === "/") return true;
  return MARKETING_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isPublicAuthPath(pathname: string) {
  return ["/login", "/register", "/forgot-password"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isNonAdminDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isCompliancePath(pathname: string) {
  return pathname === "/compliance" || pathname.startsWith("/compliance/");
}

export const ADMIN_HOME_PATH = "/admin";
export const COMPLIANCE_HOME_PATH = "/compliance";

export function getRoleSignOutPath(role?: string | null) {
  if (role === "ADMIN") return "/admin/login";
  if (role === "COMPLIANCE_OFFICER") return "/compliance/login";
  return "/";
}

export function shouldRedirectStaffFromMarketing(role?: string | null) {
  return role === "ADMIN" || role === "COMPLIANCE_OFFICER";
}
