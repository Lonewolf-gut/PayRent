"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";
import { SETTLEMENT_STATUS_LABELS } from "@/constants/platform";

export default function AdminSettlementsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("PENDING");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settlements", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/settlements${params}`);
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      const res = await fetch("/api/admin/settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
      toast.success("Settlement marked completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settlements</h1>
        <p className="text-sm text-muted-foreground">Landlord and platform payout records from financed rentals.</p>
      </div>
      <div className="flex gap-2">
        {(["PENDING", "COMPLETED", "ALL"] as const).map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="rounded-none" onClick={() => setStatusFilter(s)}>
            {s === "ALL" ? "All" : SETTLEMENT_STATUS_LABELS[s] ?? s}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <Card className="rounded-none"><CardContent className="py-10 text-center text-muted-foreground">No settlements.</CardContent></Card>
      ) : (
        data.map((s: any) => (
          <Card key={s.id} className="rounded-none">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{s.beneficiaryType} settlement</CardTitle>
                <p className="text-sm text-muted-foreground">{s.financingRequest?.property?.name ?? "—"}</p>
              </div>
              <StatusBadge status={s.status} label={SETTLEMENT_STATUS_LABELS[s.status] ?? s.status} />
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p>Gross GHS {Number(s.grossAmount).toLocaleString()} · Net GHS {Number(s.netAmount).toLocaleString()}</p>
                <p className="text-muted-foreground">Ref {s.settlementReference ?? s.id.slice(0, 8)}</p>
              </div>
              {s.status === "PENDING" && (
                <Button size="sm" className="rounded-none bg-emerald-600 hover:bg-emerald-700" onClick={() => completeMutation.mutate(s.id)}>
                  Mark completed
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
