"use client";

import { SubscriptionPricingCards } from "@/components/dashboard/SubscriptionPricingCards";
import { useSubscriptionPlan } from "@/components/dashboard/subscription-status-banner";
import { StatusBadge } from "@/components/dashboard/status-badge";

export function SubscriptionPageContent() {
  const { plan, isLoading } = useSubscriptionPlan();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">Subscription</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Upgrade to Premium with Paystack (card, bank, or Mobile Money), or pay instantly from
            your wallet balance.
          </p>
        </div>
        {!isLoading ? (
          <StatusBadge
            status={plan === "PREMIUM" ? "APPROVED" : "PENDING"}
            label={plan === "PREMIUM" ? "Premium active" : "Free plan"}
          />
        ) : null}
      </div>

      <SubscriptionPricingCards />
    </div>
  );
}
