"use client";

import { LoginActivityPanel } from "@/components/admin/login-activity-panel";

export default function ComplianceMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suspicious activity</h1>
        <p className="text-sm text-muted-foreground">
          Monitor failed logins, locked accounts, and login patterns.
        </p>
      </div>
      <LoginActivityPanel
        defaultFilter="failed"
        heightClass="h-[520px]"
        apiPath="/api/admin/fraud"
        queryKeyPrefix="compliance-fraud"
      />
    </div>
  );
}
