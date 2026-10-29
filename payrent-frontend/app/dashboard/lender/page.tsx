"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendingUp, Wallet, PieChart, Percent } from "lucide-react";

export default function LenderDashboardPage() {
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: portfolio } = useQuery({
    queryKey: ["lender-portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/financing?scope=portfolio");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const stats = useMemo(() => {
    const investments = portfolio ?? [];
    const totalInvested = investments.reduce(
      (sum: number, item: any) => sum + Number(item.investment?.amount ?? item.requestedAmount ?? 0),
      0
    );
    const active = investments.filter((item: any) => item.status === "FUNDED" || item.status === "REPAYMENT_ACTIVE").length;
    const averageRoi = investments.length
      ? investments.reduce((sum: number, item: any) => sum + Number(item.investment?.roi ?? 0), 0) / investments.length
      : 0;

    return {
      totalInvested,
      activeInvestments: active,
      roi: averageRoi,
    };
  }, [portfolio]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Lender Dashboard</h1>
        <p className="text-muted-foreground">Track investments, ROI, and funding requests</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Invested"
          value={`GHS ${Number(stats.totalInvested ?? 0).toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard title="Active Investments" value={`${stats.activeInvestments}`} icon={PieChart} />
        <StatCard title="ROI" value={`${stats.roi.toFixed(2)}%`} icon={Percent} />
        <StatCard
          title="Wallet Balance"
          value={`GHS ${Number(wallet?.balance ?? 0).toLocaleString()}`}
          icon={Wallet}
        />
      </div>
    </div>
  );
}
