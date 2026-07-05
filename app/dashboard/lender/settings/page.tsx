"use client";

import UserSettingsForm from "@/components/dashboard/UserSettingsForm";

export default function LenderSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile, payout details, and security.</p>
      </div>
      <UserSettingsForm />
    </div>
  );
}
