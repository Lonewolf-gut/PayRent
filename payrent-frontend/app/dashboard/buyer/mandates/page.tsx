"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { MANDATE_STATUS_LABELS } from "@/constants/platform";
import { SecureFileLink } from "@/components/shared/secure-file-link";
import { ExternalLink, RefreshCw } from "lucide-react";

type Mandate = {
  id: string;
  status: string;
  mandateType: string;
  mandateSource: string;
  documentUrl?: string | null;
  financingRequest?: { property?: { name: string } };
  bankAccount?: { bankName: string; accountNumberMasked?: string };
};

export default function TenantMandatesPage() {
  const queryClient = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: mandates, isLoading } = useQuery({
    queryKey: ["mandates"],
    queryFn: async () => {
      const res = await fetch("/api/mandates");
      const json = await res.json();
      return (json.data ?? []) as Mandate[];
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

  const syncMutation = useMutation({
    mutationFn: async (mandateId: string) => {
      const res = await fetch(`/api/mandates/${mandateId}/status`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as Mandate;
    },
    onSuccess: (data) => {
      toast.success(`Status: ${MANDATE_STATUS_LABELS[data.status] ?? data.status}`);
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      queryClient.invalidateQueries({ queryKey: ["financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleUpload = async (mandateId: string, file: File) => {
    setUploadingId(mandateId);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await fetch(`/api/mandates/${mandateId}/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repayment mandates</h1>
        <p className="text-muted-foreground">
          Upload scanned mandate forms or track platform-generated mandates through bank activation.
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
        mandates.map((mandate) => (
          <Card key={mandate.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  {mandate.financingRequest?.property?.name ?? "Financing mandate"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {mandate.mandateType.replace("_", " ")} ·{" "}
                  {mandate.mandateSource.replace("_", " ")} · {mandate.bankAccount?.bankName}
                </p>
              </div>
              <StatusBadge status={mandate.status} label={MANDATE_STATUS_LABELS[mandate.status]} />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Account {mandate.bankAccount?.accountNumberMasked ?? "—"}
              </p>

              {mandate.documentUrl && (
                <Button asChild size="sm" variant="outline">
                  <SecureFileLink request={{ scope: "mandate", mandateId: mandate.id }}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View mandate document
                  </SecureFileLink>
                </Button>
              )}

              {mandate.mandateSource === "SCANNED_UPLOAD" &&
                ["PENDING_SUBMISSION", "DRAFT", "REJECTED"].includes(mandate.status) && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor={`upload-${mandate.id}`}>Scanned mandate form (PDF or image)</Label>
                    <Input
                      id={`upload-${mandate.id}`}
                      type="file"
                      accept=".pdf,image/*"
                      disabled={uploadingId === mandate.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(mandate.id, file);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload your signed bank mandate form, then submit for admin review.
                    </p>
                  </div>
                )}

              <div className="flex flex-wrap gap-2">
                {["PENDING_SUBMISSION", "DRAFT"].includes(mandate.status) && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={
                      submitMutation.isPending ||
                      (mandate.mandateSource === "SCANNED_UPLOAD" && !mandate.documentUrl)
                    }
                    onClick={() => submitMutation.mutate(mandate.id)}
                  >
                    Submit for review
                  </Button>
                )}

                {["BANK_PROCESSING", "PENDING_MANUAL_RESOLUTION"].includes(mandate.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={syncMutation.isPending}
                    onClick={() => syncMutation.mutate(mandate.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh bank status
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
