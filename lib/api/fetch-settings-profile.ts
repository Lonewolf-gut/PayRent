import { apiFetch } from "@/lib/api/client";

export type SettingsUserProfile = {
  fullName?: string | null;
  email?: string;
  image?: string | null;
  role?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
};

/** Always returns null on failure — React Query queryFn must not return undefined. */
export async function fetchSettingsUserProfile(): Promise<SettingsUserProfile | null> {
  try {
    const res = await apiFetch("/api/settings");
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { user?: SettingsUserProfile | null };
    };
    if (!res.ok || json.success === false) return null;
    const user = json.data?.user;
    return user ?? null;
  } catch {
    return null;
  }
}
