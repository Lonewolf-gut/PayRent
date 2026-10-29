"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default function LenderRepaymentsPage() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["portfolio-repayments"],
    queryFn: async () => {
      const res = await fetch("/api/financing?scope=portfolio");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const instalments = portfolio?.flatMap((item: {
    property?: { name: string };
    repaymentPlan?: { installments: Array<{ id: string; amount: number; dueDate: string; status: string }> };
  }) =>
    (item.repaymentPlan?.installments ?? []).map((inst) => ({
      ...inst,
      propertyName: item.property?.name,
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repayment performance</h1>
        <p className="text-muted-foreground">
          Monitor borrower instalments and repayment status across your portfolio.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !instalments?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No repayment data yet.</CardContent></Card>
      ) : (
        instalments.map((inst: { id: string; propertyName?: string; amount: number; dueDate: string; status: string }) => (
          <Card key={inst.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{inst.propertyName}</p>
                <p className="text-sm text-muted-foreground">
                  Due {new Date(inst.dueDate).toLocaleDateString()} · GHS {Number(inst.amount).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={inst.status} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
