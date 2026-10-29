"use client";

import { AdminMandateReviewList } from "@/components/admin/admin-mandate-review-list";

export default function AdminManualBankMandatesPage() {
  return (
    <AdminMandateReviewList
      title="Manual bank mandates"
      description="Pay-for-me requests using banks other than CBG (Consolidated Bank Ghana). Print each pack, send it to the customer's bank for monthly deduction setup, then approve when the bank confirms."
      queryKey="admin-manual-bank-mandates"
      fetchUrl="/api/admin/mandates/manual-bank"
      manualOnly
      emptyMessage="No manual bank mandates waiting for admin action."
    />
  );
}
