"use client";

import { AdminMandateReviewList } from "@/components/admin/admin-mandate-review-list";

export default function AdminManualBankMandatesPage() {
  return (
    <AdminMandateReviewList
      title="Manual bank mandates"
      queryKey="admin-manual-bank-mandates"
      fetchUrl="/api/admin/mandates/manual-bank"
      emptyMessage="No manual bank mandates waiting for admin action."
      showPrintPack
    />
  );
}
