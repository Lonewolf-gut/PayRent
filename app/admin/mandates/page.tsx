"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { MANDATE_STATUS_LABELS } from "@/constants/platform";
import { toast } from "sonner";
import { ExternalLink, RefreshCw } from "lucide-react";

type Mandate = {
  id: string;
  status: string;
  mandateSource: string;
  documentUrl?: string | null;
  tenant?: { user?: { email: string } };
  bankAccount?: { bankName: string; accountNumberMasked?: string };
  financingRequest?: { property?: { name: string } };
};

export default function AdminMandatesPage() {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: mandates, isLoading } = useQuery({
    queryKey: ["admin-mandates"],
    queryFn: async () => {
      const res = await fetch("/api/mandates");
      const json = await res.json();
      return (json.data ?? []) as Mandate[];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      rejectedReason,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      rejectedReason?: string;
    }) => {
      const res = await fetch(`/api/mandates/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejectedReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Mandate reviewed");
      setRejectId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-mandates"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-badge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async (mandateId: string) => {
      const res = await fetch(`/api/mandates/${mandateId}/status`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Bank status refreshed");
      queryClient.invalidateQueries({ queryKey: ["admin-mandates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mandate review</h1>
        <p className="text-muted-foreground">
          Approve scanned mandates, resolve bank exceptions, and activate repayment deductions.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !mandates?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No mandates pending review.
          </CardContent>
        </Card>
      ) : (
        mandates.map((mandate) => (
          <Card key={mandate.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{mandate.tenant?.user?.email}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {mandate.financingRequest?.property?.name ?? "Financing mandate"} ·{" "}
                  {mandate.bankAccount?.bankName} · {mandate.mandateSource.replace("_", " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Account {mandate.bankAccount?.accountNumberMasked ?? "—"}
                </p>
              </div>
              <StatusBadge status={mandate.status} label={MANDATE_STATUS_LABELS[mandate.status]} />
            </CardHeader>
            <CardContent className="space-y-4">
              {mandate.documentUrl && (
                <Button asChild size="sm" variant="outline">
                  <a href={mandate.documentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View mandate document
                  </a>
                </Button>
              )}

              {rejectId === mandate.id ? (
                <div className="space-y-2 rounded-lg border p-4">
                  <Label htmlFor={`reject-${mandate.id}`}>Rejection reason</Label>
                  <Input
                    id={`reject-${mandate.id}`}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why the mandate was rejected"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={reviewMutation.isPending}
                      onClick={() =>
                        reviewMutation.mutate({
                          id: mandate.id,
                          decision: "REJECT",
                          rejectedReason: rejectReason || "Rejected by administrator",
                        })
                      }
                    >
                      Confirm reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {["ADMIN_REVIEW", "PENDING_MANUAL_RESOLUTION"].includes(mandate.status) && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ id: mandate.id, decision: "APPROVE" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectId(mandate.id)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {mandate.status === "BANK_PROCESSING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate(mandate.id)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Poll bank status
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
