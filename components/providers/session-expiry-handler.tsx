"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

export function SessionExpiryHandler() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.expires) return;

    const expiresAt = new Date(session.expires).getTime();
    const msUntilExpiry = expiresAt - Date.now();

    if (msUntilExpiry <= 0) {
      void signOut({ callbackUrl: "/login?reason=session-expired" });
      return;
    }

    const timer = window.setTimeout(() => {
      toast.info("Your session expired. Please sign in again.");
      void signOut({ callbackUrl: "/login?reason=session-expired" });
    }, msUntilExpiry);

    return () => window.clearTimeout(timer);
  }, [session?.expires, status]);

  return null;
}
