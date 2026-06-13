"use client";

import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DollarSign, Users, Building2, TrendingUp } from "lucide-react";

export default function CeoDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["ceo-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/ceo");
      const json = await res.json();
      return json.data;
    },
  });

  const overview = data?.overview;

  if (isLoading) {
    return <p className="text-muted-foreground">Loading analytics...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">CEO Dashboard</h1>
        <p className="text-muted-foreground">Platform revenue, growth, and performance</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`GHS ${Number(overview?.monthlyRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          description="This month"
        />
        <StatCard
          title="Total Commission"
          value={`GHS ${Number(overview?.totalCommission ?? 0).toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Active Users"
          value={String(overview?.totalUsers ?? 0)}
          icon={Users}
        />
        <StatCard
          title="Properties"
          value={String(overview?.totalProperties ?? 0)}
          icon={Building2}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Revenue Trend"
          data={data?.charts?.revenueTrend ?? []}
          dataKey="revenue"
        />
        <ChartCard
          title="User Growth"
          data={data?.charts?.userGrowth ?? []}
          dataKey="count"
          color="#2563eb"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Tenants" value={String(overview?.totalTenants ?? 0)} icon={Users} />
        <StatCard title="Landlords" value={String(overview?.totalLandlords ?? 0)} icon={Building2} />
        <StatCard title="Lenders" value={String(overview?.totalLenders ?? 0)} icon={TrendingUp} />
      </div>
    </div>
  );
}
