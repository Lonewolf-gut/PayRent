"use client";

import UserSettingsForm from "@/components/dashboard/UserSettingsForm";

export default function ComplianceSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your compliance officer profile and security preferences.
        </p>
      </div>
      <UserSettingsForm showBankSection={false} />
    </div>
  );
}
