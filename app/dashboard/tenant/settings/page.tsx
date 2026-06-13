"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SecuritySettings } from "@/components/dashboard/security-settings";
import { toast } from "sonner";

export default function TenantSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SecuritySettings />
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const res = await fetch("/api/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "upgrade",
                  plan: "STANDARD",
                  billingCycle: "MONTHLY",
                }),
              });
              const json = await res.json();
              if (json.success) toast.success("Upgraded to Standard");
              else toast.error(json.error?.message);
            }}
          >
            Upgrade to Standard
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const res = await fetch("/api/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "upgrade",
                  plan: "PREMIUM",
                  billingCycle: "ANNUAL",
                }),
              });
              const json = await res.json();
              if (json.success) toast.success("Upgraded to Premium");
              else toast.error(json.error?.message);
            }}
          >
            Upgrade to Premium
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              const res = await fetch("/api/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel" }),
              });
              if ((await res.json()).success) toast.success("Subscription cancelled");
            }}
          >
            Cancel plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
