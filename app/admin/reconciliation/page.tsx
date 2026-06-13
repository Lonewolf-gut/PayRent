"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";

export default function AdminReconciliationPage() {
  const queryClient = useQueryClient();

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ["reconciliation"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews?type=reconciliation");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exceptionId, resolutionNote: "Resolved by admin" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Exception resolved");
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation exceptions</h1>
        <p className="text-muted-foreground">
          Investigate payment, deduction, and settlement mismatches.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !exceptions?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No reconciliation exceptions.</CardContent></Card>
      ) : (
        exceptions.map((ex: {
          id: string;
          exceptionType: string;
          status: string;
          expectedAmount?: number;
          actualAmount?: number;
          providerReference?: string;
        }) => (
          <Card key={ex.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{ex.exceptionType}</CardTitle>
                <p className="text-sm text-muted-foreground">{ex.providerReference}</p>
              </div>
              <StatusBadge status={ex.status} />
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Expected GHS {Number(ex.expectedAmount ?? 0).toLocaleString()} · Actual GHS {Number(ex.actualAmount ?? 0).toLocaleString()}
              </p>
              {ex.status !== "RESOLVED" && (
                <Button size="sm" onClick={() => resolveMutation.mutate(ex.id)}>Resolve</Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
