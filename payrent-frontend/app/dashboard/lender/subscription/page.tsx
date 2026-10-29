"use client";

import { SubscriptionPageContent } from "@/components/dashboard/subscription-page-content";

export default function LenderSubscriptionPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-none border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Free lenders can finance up to 100 properties. Subscribe to Pro or Max for unlimited financing access.
      </div>
      <SubscriptionPageContent />
    </div>
  );
}
