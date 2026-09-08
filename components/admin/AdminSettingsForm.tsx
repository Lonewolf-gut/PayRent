"use client";

import UserSettingsForm from "@/components/dashboard/UserSettingsForm";

export default function AdminSettingsForm() {
  return (
    <UserSettingsForm
      settingsApi="/api/admin/settings"
      imageApi="/api/admin/settings/image"
      bankApi="/api/admin/settings/bank-account"
      updateSessionAfterUpload
    />
  );
}
