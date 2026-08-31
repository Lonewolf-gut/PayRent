"use client";

import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/stat-card";
import { Wallet, CreditCard, Building2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinancingStatusLabel } from "@/lib/financing/request-pipeline";

export default function TenantDashboardPage() {
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: financing } = useQuery({
    queryKey: ["financing"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Buyer Dashboard</h1>
        <p className="text-muted-foreground">
          Search listings, manage applications, Pay for Rent financing, mandates, and repayments
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Wallet Balance"
          value={`GHS ${Number(wallet?.balance ?? 0).toLocaleString()}`}
          icon={Wallet}
        />
        <StatCard
          title="Financing Requests"
          value={String(financing?.length ?? 0)}
          icon={CreditCard}
        />
        <StatCard
          title="Saved Properties"
          value="—"
          icon={Building2}
          description="Browse to save"
        />
        <StatCard
          title="Next Payment"
          value="—"
          icon={Calendar}
          description="View repayment schedule"
        />
      </div>
      <Card className="flex max-h-[320px] flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Recent financing requests</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          {!financing?.length ? (
            <p className="text-sm text-muted-foreground">
              No financing requests yet. Browse properties to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {financing.slice(0, 5).map((req: { id: string; status: string; property?: { name: string }; requestedAmount: number }) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-medium">{req.property?.name ?? "Property"}</span>
                  <span className="text-sm text-muted-foreground">
                    GHS {Number(req.requestedAmount).toLocaleString()} ·{" "}
                    {getFinancingStatusLabel(req.status) ?? req.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
