"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MandateAccordionList } from "@/components/mandates/mandate-accordion-list";
import { fetchMandatePreviews } from "@/lib/mandates/fetch-mandate-previews";
import type { MandatePreviewData } from "@/lib/utils/mandate-preview";
import { Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MandateRecord = {
  id: string;
  status: string;
  mandateSource: string;
  documentUrl?: string | null;
  financingRequest?: { id: string; property?: { name: string } };
};

export default function TenantMandatesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFinancingRequestId, setSelectedFinancingRequestId] = useState<string | null>(
    null
  );

  const {
    data: previews = [],
    isLoading: previewsLoading,
    isError: previewsError,
    error: previewsErrorMessage,
  } = useQuery({
    queryKey: ["mandate-overview"],
    queryFn: fetchMandatePreviews,
    retry: 1,
  });

  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: async () => {
      const res = await fetch("/api/mandates");
      const json = await res.json();
      return (json.data ?? []) as MandateRecord[];
    },
  });

  useEffect(() => {
    if (previewsError && previewsErrorMessage instanceof Error) {
      toast.error(previewsErrorMessage.message);
    }
  }, [previewsError, previewsErrorMessage]);

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
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
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
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
      queryClient.invalidateQueries({ queryKey: ["financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ensureDraftMandate = async (financingRequestId: string) => {
    const res = await fetch("/api/mandates/ensure-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ financingRequestId }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message ?? "Could not prepare mandate for upload");
    }
    return json.data?.mandateId as string;
  };

  useEffect(() => {
    if (!previews.length) return;
    setSelectedFinancingRequestId((current) => {
      if (current && previews.some((preview) => preview.financingRequestId === current)) {
        return current;
      }
      return previews[0]?.financingRequestId ?? null;
    });
  }, [previews]);

  const selectedPreview =
    previews.find((preview) => preview.financingRequestId === selectedFinancingRequestId) ??
    previews[0];

  const uploadFile = async (file: File) => {
    const targetPreview = selectedPreview ?? previews[0];
    if (!targetPreview) {
      toast.error("Submit a Pay-for-Me request first");
      return;
    }

    setUploading(true);
    try {
      let mandateId = targetPreview.mandateId;
      if (!mandateId) {
        mandateId = await ensureDraftMandate(targetPreview.financingRequestId);
      }
      if (!mandateId) {
        throw new Error("Could not prepare a mandate for this request");
      }

      const formData = new FormData();
      formData.append("document", file);
      const res = await fetch(`/api/mandates/${mandateId}/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("Mandate uploaded");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getMandateForPreview = (preview: MandatePreviewData) =>
    mandates.find((mandate) => mandate.id === preview.mandateId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Repayment mandates</h1>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            disabled={uploading || !previews.length}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploadDialogOpen(false);
                uploadFile(file);
              }
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={uploading || !previews.length}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploadDialogOpen(false);
                uploadFile(file);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={uploading || !previews.length}
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload mandate"}
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add signed mandate</DialogTitle>
                <DialogDescription>
                  Upload a PDF or photo from your device, or take a picture of the signed mandate
                  with your camera.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload file
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={uploading}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take photo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {previewsLoading ? (
        <p className="text-muted-foreground">Loading mandates...</p>
      ) : previewsError ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <p className="text-muted-foreground">
              Could not load mandates. Make sure PayRent-Backend is running on port 3001.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["mandate-overview"] })}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !previews.length ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center text-muted-foreground">
            <p>No mandates yet. Submit a Pay-for-Me request from a listing first.</p>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/properties">Browse listings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <MandateAccordionList
          previews={previews}
          getMandateForPreview={getMandateForPreview}
          onSubmitScanned={(mandateId) => submitMutation.mutate(mandateId)}
          onRefreshStatus={(mandateId) => syncMutation.mutate(mandateId)}
          submitPending={submitMutation.isPending}
          syncPending={syncMutation.isPending}
          selectedFinancingRequestId={selectedFinancingRequestId ?? undefined}
          onSelectedFinancingRequestIdChange={setSelectedFinancingRequestId}
        />
        </div>
      )}
    </div>
  );
}
