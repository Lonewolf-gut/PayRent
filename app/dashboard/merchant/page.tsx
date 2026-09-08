"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/stat-card";
import { Building2, Wallet, CheckCircle, Archive } from "lucide-react";

export default function LandlordDashboardPage() {
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: properties } = useQuery({
    queryKey: ["landlord-properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties/landlord");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: settlements } = useQuery({
    queryKey: ["settlements"],
    queryFn: async () => {
      const res = await fetch("/api/settlements");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const stats = useMemo(() => {
    const listingCount = (properties ?? []).length;
    const settledCount = (settlements ?? []).filter((s: any) => s.status === "COMPLETED").length;
    return { listingCount, settledCount };
  }, [properties, settlements]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Merchant Dashboard</h1>
        <p className="text-muted-foreground">Manage listings, affiliates, and earnings</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Listings" value={`${stats.listingCount}`} icon={Building2} />
        <StatCard title="Completed Settlements" value={`${stats.settledCount}`} icon={Archive} />
        <StatCard
          title="Wallet Balance"
          value={`GHS ${Number(wallet?.balance ?? 0).toLocaleString()}`}
          icon={Wallet}
        />
        <StatCard title="Verified" value="Pending" icon={CheckCircle} />
      </div>
    </div>
  );
}
