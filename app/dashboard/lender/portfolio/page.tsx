"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function LenderPortfolioPage() {
  const { data: financing, isLoading } = useQuery({
    queryKey: ["financing-portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/financing?scope=portfolio");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Investment Portfolio</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !financing?.length ? (
        <p className="text-muted-foreground">No active investments yet.</p>
      ) : (
        <div className="grid gap-4">
          {financing.map((item: {
            id: string;
            requestedAmount: number;
            property?: { name: string };
            investment?: { interestRate: number; amount: number };
            repaymentPlan?: {
              installments: { status: string }[];
            };
          }) => {
            const installments = item.repaymentPlan?.installments ?? [];
            const paid = installments.filter((i) => i.status === "PAID").length;
            const progress =
              installments.length > 0 ? (paid / installments.length) * 100 : 0;

            return (
              <Card key={item.id}>
                <CardHeader className="flex flex-row justify-between">
                  <CardTitle className="text-base">{item.property?.name}</CardTitle>
                  <Badge variant="secondary">FUNDED</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    Invested: GHS {Number(item.investment?.amount ?? item.requestedAmount).toLocaleString()}
                    {" · "}
                    Rate: {Number(item.investment?.interestRate ?? 0)}%
                  </p>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Repayment progress ({paid}/{installments.length})
                    </p>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
