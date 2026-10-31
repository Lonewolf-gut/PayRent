import type { MandatePreviewData } from "@/lib/utils/mandate-preview";

export const MANDATE_PREVIEW_STATUS_LABELS: Record<
  MandatePreviewData["previewStatus"],
  string
> = {
  awaiting_lender: "Awaiting lender rate",
  awaiting_buyer: "Review lender offer",
  mandate_pending: "Mandate prepared",
  bank_processing: "Bank processing",
  active: "Active mandate",
  declined: "Declined / cancelled",
  none: "Not available",
};

export function mandatePreviewShortLabel(status: MandatePreviewData["previewStatus"]) {
  const full = MANDATE_PREVIEW_STATUS_LABELS[status];
  if (status === "awaiting_lender") return "Awaiting lender";
  if (status === "awaiting_buyer") return "Review offer";
  if (status === "mandate_pending") return "Mandate ready";
  if (status === "bank_processing") return "At bank";
  if (status === "active") return "Active";
  if (status === "declined") return "Declined";
  return full;
}
