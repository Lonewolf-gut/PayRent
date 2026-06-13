"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, TrendingUp, Users, Building2, Banknote } from "lucide-react";

export default function CeoRevenuePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ceo-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/ceo");
      if (!res.ok) {
        throw new Error("Unable to load CEO analytics");
      }
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading revenue analytics...</p>;
  }

  if (isError || !data) {
    return <p className="text-red-500">Unable to load revenue analytics. Please try again later.</p>;
  }

  const overview = data.overview;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Revenue Analytics</h1>
        <p className="text-muted-foreground">CEO-level revenue and platform performance metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Revenue"
          value={`GHS ${Number(overview.monthlyRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Commission"
          value={`GHS ${Number(overview.totalCommission ?? 0).toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Platform Balance"
          value={`GHS ${Number(overview.platformBalance ?? 0).toLocaleString()}`}
          icon={Banknote}
        />
        <StatCard
          title="Completed Transactions"
          value={String(overview.totalTransactions ?? 0)}
          icon={Building2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Revenue Trend"
          data={data.charts?.revenueTrend ?? []}
          dataKey="revenue"
        />
        <ChartCard
          title="Investment Growth"
          data={data.charts?.investmentGrowth ?? []}
          dataKey="amount"
          color="#2563eb"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Users" value={String(overview.totalUsers ?? 0)} icon={Users} />
        <StatCard title="Properties" value={String(overview.totalProperties ?? 0)} icon={Building2} />
        <StatCard title="Active Properties" value={String(overview.activeProperties ?? 0)} icon={TrendingUp} />
      </div>
    </div>
  );
}
