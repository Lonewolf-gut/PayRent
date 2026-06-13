"use client";

import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/stat-card";
import { Users, Building2, CreditCard, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          User management, fraud monitoring, and platform oversight
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={String(data?.users ?? "—")} icon={Users} />
        <StatCard title="Active Properties" value={String(data?.properties ?? "—")} icon={Building2} />
        <StatCard title="Transactions" value={String(data?.transactions ?? "—")} icon={CreditCard} />
        <StatCard
          title="Failed logins (24h)"
          value={String(data?.failedLogins ?? 0)}
          icon={AlertTriangle}
          description="Fraud monitoring"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{data?.pendingProperties ?? 0} properties awaiting verification</p>
            <p>{data?.pendingFinancing ?? 0} financing requests pending</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/admin/properties">Review properties</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              GHS {Number(data?.revenue?.monthlyRevenue ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
