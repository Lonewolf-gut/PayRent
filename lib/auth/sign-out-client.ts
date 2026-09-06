import { signOut } from "next-auth/react";
import { getRoleSignOutPath } from "@/lib/auth/route-guards";

export async function signOutToRoleHome(role?: string | null) {
  const callbackUrl = getRoleSignOutPath(role);
  try {
    await signOut({ redirect: false });
  } catch {
    // Fall through — still send the user to a public page.
  }
  window.location.assign(callbackUrl);
}
