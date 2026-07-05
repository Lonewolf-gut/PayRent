"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default function AdminSettingsPage() {
  const { data: platform } = useQuery({
    queryKey: ["admin-platform"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin settings</h1>
        <p className="text-muted-foreground">Your account and platform configuration overview.</p>
      </div>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Platform configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <p><span className="text-muted-foreground">Environment:</span> {platform?.environment ?? "—"}</p>
            <p><span className="text-muted-foreground">Currency:</span> {platform?.currency ?? "GHS"}</p>
            <p><span className="text-muted-foreground">Service fee:</span> {platform?.fees?.serviceFeePercent ?? "—"}%</p>
            <p><span className="text-muted-foreground">Commission:</span> {platform?.fees?.commissionFeePercent ?? "—"}%</p>
            <p><span className="text-muted-foreground">Processing fee:</span> {platform?.fees?.processingFeePercent ?? "—"}%</p>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="mb-3 font-medium">Integrations</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={platform?.integrations?.payments?.configured ? "APPROVED" : "PENDING"}
                label={`Payments (${platform?.integrations?.payments?.provider ?? "—"})`}
              />
              <StatusBadge
                status={platform?.integrations?.kyc?.dojahConfigured ? "APPROVED" : "PENDING"}
                label={`KYC (${platform?.integrations?.kyc?.provider ?? "manual"})`}
              />
              <StatusBadge
                status={platform?.integrations?.email?.configured ? "APPROVED" : "PENDING"}
                label="Email SMTP"
              />
              <StatusBadge
                status={platform?.integrations?.bankMandates?.configured ? "APPROVED" : "PENDING"}
                label="Bank mandates"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Fee rates and provider keys are configured via environment variables (.env). Restart the server after changes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Your account</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <AdminSettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
