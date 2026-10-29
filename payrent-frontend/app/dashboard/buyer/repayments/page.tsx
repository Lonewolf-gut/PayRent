"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";

export default function TenantRepaymentsPage() {
  const queryClient = useQueryClient();

  const { data: installments, isLoading } = useQuery({
    queryKey: ["installments"],
    queryFn: async () => {
      const res = await fetch("/api/financing/installments");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const payMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      const res = await fetch("/api/financing/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
    },
    onSuccess: () => {
      toast.success("Repayment recorded");
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const outstanding = installments
    ?.filter((i: { status: string }) => i.status !== "PAID")
    .reduce((sum: number, i: { amount: number }) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repayment schedule</h1>
        <p className="text-muted-foreground">
          Track instalments, deductions, and outstanding balance.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Outstanding balance</p>
            <p className="text-2xl font-bold text-emerald-700">
              GHS {(outstanding ?? 0).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Loading schedule...</p>
      ) : !installments?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active repayment plans.
          </CardContent>
        </Card>
      ) : (
        installments.map((inst: {
          id: string;
          amount: number;
          dueDate: string;
          status: string;
          propertyName: string;
          instalmentNumber?: number;
        }) => (
          <Card key={inst.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">
                  Instalment {inst.instalmentNumber ?? "—"} · {inst.propertyName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Due {new Date(inst.dueDate).toLocaleDateString()} · GHS{" "}
                  {Number(inst.amount).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={inst.status} />
                {inst.status === "PENDING" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={payMutation.isPending}
                    onClick={() => payMutation.mutate(inst.id)}
                  >
                    Pay now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
