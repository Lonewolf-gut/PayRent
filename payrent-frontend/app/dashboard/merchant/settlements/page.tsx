"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SETTLEMENT_STATUS_LABELS } from "@/constants/platform";

export default function LandlordSettlementsPage() {
  const { data: settlements, isLoading } = useQuery({
    queryKey: ["settlements"],
    queryFn: async () => {
      const res = await fetch("/api/settlements");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settlement history</h1>
        <p className="text-muted-foreground">
          Track disbursements and settlement status from financed tenancies.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading settlements...</p>
      ) : !settlements?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No settlements recorded yet.</CardContent></Card>
      ) : (
        settlements.map((s: {
          id: string;
          status: string;
          grossAmount: number;
          feeAmount: number;
          netAmount: number;
          settlementReference?: string;
          financingRequest?: { property?: { name: string } };
        }) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{s.financingRequest?.property?.name ?? "Settlement"}</CardTitle>
                <p className="text-sm text-muted-foreground">{s.settlementReference}</p>
              </div>
              <StatusBadge status={s.status} label={SETTLEMENT_STATUS_LABELS[s.status]} />
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
              <p>Gross: GHS {Number(s.grossAmount).toLocaleString()}</p>
              <p>Fees: GHS {Number(s.feeAmount).toLocaleString()}</p>
              <p className="font-medium text-emerald-700">Net: GHS {Number(s.netAmount).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
