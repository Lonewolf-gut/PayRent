"use client";

import { AdminMandateReviewList } from "@/components/admin/admin-mandate-review-list";

export default function AdminMandatesPage() {
  return (
    <AdminMandateReviewList
      title="Mandate review"
      description="Approve scanned mandates, resolve bank exceptions, and activate repayment deductions. CBG mandates use the bank API; other banks are handled under Manual bank mandates."
      queryKey="admin-mandates"
      fetchUrl="/api/mandates"
      emptyMessage="No mandates pending review."
    />
  );
}
