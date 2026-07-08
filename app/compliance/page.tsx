"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, FileText, AlertTriangle, BarChart3 } from "lucide-react";

export default function ComplianceOverviewPage() {
  const { data } = useQuery({
    queryKey: ["compliance-overview"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/overview");
      const json = await res.json();
      return json.data as {
        pendingKyc?: number;
        failedLogins24h?: number;
        auditLogs24h?: number;
      };
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Compliance portal</h1>
        <p className="text-muted-foreground">
          Review audit logs, verify KYC records, monitor suspicious activity, and export reports.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending KYC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.pendingKyc ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed logins (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.failedLogins24h ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audit events (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.auditLogs24h ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { href: "/compliance/audit-logs", label: "Audit logs", desc: "Review platform audit trail", icon: FileText },
          { href: "/compliance/kyc", label: "KYC review", desc: "Verify identity and KYC records", icon: Shield },
          { href: "/compliance/monitoring", label: "Suspicious activity", desc: "Login failures and locked accounts", icon: AlertTriangle },
          { href: "/compliance/reports", label: "Reports", desc: "Export compliance reports", icon: BarChart3 },
        ].map((item) => (
          <Card key={item.href} className="rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <item.icon className="h-4 w-4 text-emerald-600" />
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{item.desc}</p>
              <Button asChild variant="outline" size="sm" className="rounded-none">
                <Link href={item.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
