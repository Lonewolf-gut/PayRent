"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchMandatePreviews,
  filterMandatePreviewsForProperty,
} from "@/lib/mandates/fetch-mandate-previews";
import { MANDATE_PREVIEW_STATUS_LABELS } from "@/lib/mandates/preview-status-labels";
import { downloadMandatePdf } from "@/lib/utils/mandate-pdf";
import { toast } from "sonner";

async function fetchFinancingForProperty(propertyId: string) {
  const res = await fetch("/api/financing");
  const json = await res.json();
  if (!json.success) return null;
  return (
    (json.data ?? []).find(
      (row: { propertyId?: string; property?: { id?: string } }) =>
        row.propertyId === propertyId || row.property?.id === propertyId
    ) ?? null
  );
}

export function PropertyMandatePanel({
  propertyId,
  propertyName,
  enabled = true,
}: {
  propertyId: string;
  propertyName: string;
  enabled?: boolean;
}) {
  const { data: financingRow } = useQuery({
    queryKey: ["financing-for-property", propertyId],
    queryFn: () => fetchFinancingForProperty(propertyId),
    enabled,
  });

  const { data: previews = [], isLoading } = useQuery({
    queryKey: ["mandate-overview"],
    queryFn: fetchMandatePreviews,
    enabled: enabled && !!financingRow,
    retry: 1,
  });

  const propertyPreviews = filterMandatePreviewsForProperty(previews, propertyId, propertyName);
  const preview =
    propertyPreviews.find((item) => item.financingRequestId === financingRow?.id) ??
    propertyPreviews[0];

  if (!enabled || !financingRow || isLoading) return null;
  if (!preview) {
    return (
      <Card className="rounded-none border-emerald-600/30">
        <CardContent className="space-y-3 py-6">
          <p className="text-sm font-medium text-foreground">Repayment mandate</p>
          <p className="text-sm text-muted-foreground">
            Your pay-for-me request is in progress. Open the mandate workspace to download the PDF
            once your lender offer is ready.
          </p>
          <Button asChild size="sm" className="rounded-none bg-emerald-600 hover:bg-emerald-700">
            <Link href="/dashboard/buyer/mandates">Open mandate workspace</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none border-emerald-600/30">
      <CardHeader>
        <CardTitle className="text-base">Repayment mandate</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review your mandate PDF, sign when approved, and track bank processing for this listing.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground">
          Status:{" "}
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {MANDATE_PREVIEW_STATUS_LABELS[preview.previewStatus]}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={async () => {
              try {
                await downloadMandatePdf(preview);
              } catch {
                toast.error("Could not generate mandate PDF");
              }
            }}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Download mandate PDF
          </Button>
          <Button asChild size="sm" className="rounded-none bg-emerald-600 hover:bg-emerald-700">
            <Link href="/dashboard/buyer/mandates">Open mandate workspace</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
