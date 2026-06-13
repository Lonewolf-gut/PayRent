"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { MANDATE_STATUS_LABELS } from "@/constants/platform";
import { toast } from "sonner";

export default function AdminMandatesPage() {
  const queryClient = useQueryClient();

  const { data: mandates, isLoading } = useQuery({
    queryKey: ["admin-mandates"],
    queryFn: async () => {
      const res = await fetch("/api/mandates");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "APPROVE" | "REJECT" }) => {
      const res = await fetch(`/api/mandates/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Mandate reviewed");
      queryClient.invalidateQueries({ queryKey: ["admin-mandates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mandate review</h1>
        <p className="text-muted-foreground">
          Approve scanned mandates and activate repayment deductions.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !mandates?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No mandates pending review.</CardContent></Card>
      ) : (
        mandates.map((mandate: {
          id: string;
          status: string;
          mandateSource: string;
          tenant?: { user?: { email: string } };
          bankAccount?: { bankName: string };
        }) => (
          <Card key={mandate.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{mandate.tenant?.user?.email}</CardTitle>
                <p className="text-sm text-muted-foreground">{mandate.bankAccount?.bankName} · {mandate.mandateSource.replace("_", " ")}</p>
              </div>
              <StatusBadge status={mandate.status} label={MANDATE_STATUS_LABELS[mandate.status]} />
            </CardHeader>
            <CardContent className="flex gap-2">
              {["ADMIN_REVIEW", "PENDING_MANUAL_RESOLUTION"].includes(mandate.status) && (
                <>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => reviewMutation.mutate({ id: mandate.id, decision: "APPROVE" })}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => reviewMutation.mutate({ id: mandate.id, decision: "REJECT" })}>Reject</Button>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
