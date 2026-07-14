"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

const FRESH_LOGIN_KEY = "fresh-dashboard-login";
const FRESH_LOGIN_GRACE_MS = 15 * 60 * 1000;
const MIN_TIMER_MS = 5 * 60 * 1000;

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

function isWithinFreshLoginGrace() {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(FRESH_LOGIN_KEY) !== "1") return false;
  const startedAt = Number(sessionStorage.getItem(`${FRESH_LOGIN_KEY}:at`) ?? "0");
  if (!startedAt) return true;
  return Date.now() - startedAt < FRESH_LOGIN_GRACE_MS;
}

export function SessionExpiryHandler() {
  const pathname = usePathname();
  const { data: session, status, update } = useSession();

  useEffect(() => {
    if (
      isAuthPath(pathname) ||
      status !== "authenticated" ||
      !session?.expires ||
      isWithinFreshLoginGrace()
    ) {
      return;
    }

    const expiresAt = new Date(session.expires).getTime();
    if (!Number.isFinite(expiresAt)) return;

    const msUntilExpiry = expiresAt - Date.now();

    if (msUntilExpiry <= 0) {
      void update();
      return;
    }

    if (msUntilExpiry < MIN_TIMER_MS) {
      return;
    }

    const timer = window.setTimeout(() => {
      toast.info("Your session expired. Please sign in again.");
      void signOut({ callbackUrl: "/login?reason=session-expired" });
    }, msUntilExpiry);

    return () => window.clearTimeout(timer);
  }, [pathname, session?.expires, status, update]);

  return null;
}
