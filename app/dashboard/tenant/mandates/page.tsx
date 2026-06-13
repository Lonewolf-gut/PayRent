"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { MANDATE_STATUS_LABELS } from "@/constants/platform";
import { toast } from "sonner";

export default function TenantMandatesPage() {
  const queryClient = useQueryClient();

  const { data: mandates, isLoading } = useQuery({
    queryKey: ["mandates"],
    queryFn: async () => {
      const res = await fetch("/api/mandates");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (mandateId: string) => {
      const res = await fetch("/api/mandates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandateId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Mandate submitted for review");
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repayment mandates</h1>
        <p className="text-muted-foreground">
          Manage direct debit mandates required for Pay for Rent financing.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading mandates...</p>
      ) : !mandates?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No mandates yet. Create one from your financing request after approval.
          </CardContent>
        </Card>
      ) : (
        mandates.map((mandate: {
          id: string;
          status: string;
          mandateType: string;
          mandateSource: string;
          financingRequest?: { property?: { name: string } };
          bankAccount?: { bankName: string; accountNumberMasked?: string };
        }) => (
          <Card key={mandate.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  {mandate.financingRequest?.property?.name ?? "Financing mandate"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {mandate.mandateType.replace("_", " ")} · {mandate.bankAccount?.bankName}
                </p>
              </div>
              <StatusBadge status={mandate.status} label={MANDATE_STATUS_LABELS[mandate.status]} />
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Account {mandate.bankAccount?.accountNumberMasked ?? "—"}
              </p>
              {["PENDING_SUBMISSION", "DRAFT"].includes(mandate.status) && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={submitMutation.isPending}
                  onClick={() => submitMutation.mutate(mandate.id)}
                >
                  Submit mandate
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
