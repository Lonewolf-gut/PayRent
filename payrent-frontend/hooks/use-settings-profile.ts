"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchSettingsUserProfile,
  type SettingsUserProfile,
} from "@/lib/api/fetch-settings-profile";

export const SETTINGS_PROFILE_QUERY_KEY = ["settings-profile"] as const;

async function querySettingsProfile(): Promise<SettingsUserProfile | null> {
  const profile = await fetchSettingsUserProfile();
  return profile ?? null;
}

export function useSettingsProfile(enabled = true) {
  return useQuery({
    queryKey: SETTINGS_PROFILE_QUERY_KEY,
    queryFn: querySettingsProfile,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function settingsProfileQueryOptions(enabled = true) {
  return {
    queryKey: SETTINGS_PROFILE_QUERY_KEY,
    queryFn: querySettingsProfile,
    enabled,
    staleTime: 60 * 1000,
  } as const;
}
