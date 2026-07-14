"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/admin/login",
  "/compliance/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

function isAuthPath(pathname: string | null) {
  if (!pathname) return false;
  if (AUTH_PATHS.has(pathname)) return true;
  return pathname.startsWith("/register/");
}

export function SessionExpiryHandler() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (isAuthPath(pathname) || status !== "authenticated" || !session?.expires) {
      return;
    }

    const expiresAt = new Date(session.expires).getTime();
    if (!Number.isFinite(expiresAt)) return;

    const msUntilExpiry = expiresAt - Date.now();
    const graceMs = 60_000;

    // Stale cookie right after login or clock skew — clear quietly, no toast.
    if (msUntilExpiry <= -graceMs) {
      void signOut({ callbackUrl: "/login" });
      return;
    }

    if (msUntilExpiry <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      toast.info("Your session expired. Please sign in again.");
      void signOut({ callbackUrl: "/login?reason=session-expired" });
    }, msUntilExpiry);

    return () => window.clearTimeout(timer);
  }, [pathname, session?.expires, status]);

  return null;
}
