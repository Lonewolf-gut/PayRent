"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FINANCING_STATUS_LABELS } from "@/constants/platform";

export default function AdminFinancingPage() {
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-financing", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/financing${params}`);
      const json = await res.json();
      return json.data as { requests: any[]; total: number; pendingCount: number };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financing oversight</h1>
        <p className="text-sm text-muted-foreground">
          {data?.pendingCount ?? 0} pending lender review · {data?.total ?? 0} in current filter
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["PENDING", "UNDER_REVIEW", "READY_FOR_LENDER_REVIEW", "FUNDED", "REJECTED", "ALL"].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="rounded-none" onClick={() => setStatusFilter(s)}>
            {s === "ALL" ? "All" : FINANCING_STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data?.requests?.length ? (
        <Card className="rounded-none"><CardContent className="py-10 text-center text-muted-foreground">No financing requests.</CardContent></Card>
      ) : (
        data.requests.map((r: any) => (
          <Card key={r.id} className="rounded-none">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{r.property?.name ?? "Property"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tenant {r.tenant?.user?.email ?? "—"} · GHS {Number(r.requestedAmount).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={r.status} label={FINANCING_STATUS_LABELS[r.status] ?? r.status} />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {r.investment?.lender?.user?.email ? (
                <p>Lender: {r.investment.lender.user.email}</p>
              ) : (
                <p>Awaiting lender assignment</p>
              )}
              <p className="mt-1">Submitted {new Date(r.createdAt).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
