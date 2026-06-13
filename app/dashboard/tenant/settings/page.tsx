"use client";

import UserSettingsForm from "@/components/dashboard/UserSettingsForm";
import { SubscriptionPricingCards } from "@/components/dashboard/SubscriptionPricingCards";
import { SecuritySettings } from "@/components/dashboard/security-settings";

export default function TenantSettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <UserSettingsForm />
      <SecuritySettings />
      <div>
        <h2 className="mb-4 text-lg font-semibold">Subscription</h2>
        <SubscriptionPricingCards />
      </div>
    </div>
  );
}
