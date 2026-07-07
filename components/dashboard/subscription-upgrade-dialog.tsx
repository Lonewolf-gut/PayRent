"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PricingCardsSection } from "@/components/subscription/pricing-cards-section";
import {
  getAnnualSavingsPercent,
  isPaidPlan,
  normalizeSubscriptionPlan,
  PLAN_CATALOG,
  type CheckoutPlanId,
} from "@/lib/subscription/plans";
import { getSubscriptionPrice } from "@/lib/subscription/pricing";
import { useSubscriptionUpgrade } from "@/components/subscription/subscription-upgrade-provider";
import { toast } from "sonner";

type BillingCycle = "MONTHLY" | "ANNUAL";
type PaymentMethod = "wallet" | "paystack";

export function SubscriptionUpgradeDialog() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { open, initialPlan, closeUpgrade } = useSubscriptionUpgrade();
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlanId | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("ANNUAL");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paystack");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      return json.data;
    },
    enabled: open && !!session?.user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data as { balance?: number | string } | null;
    },
    enabled: open && !!session?.user,
  });

  const currentPlan = normalizeSubscriptionPlan(
    subscriptionData?.subscription?.plan ?? "FREE"
  );
  const walletBalance = Number(wallet?.balance ?? 0);
  const checkoutPlan = selectedPlan && selectedPlan !== "FREE" ? selectedPlan : null;
  const planMeta = checkoutPlan ? PLAN_CATALOG[checkoutPlan] : null;
  const price = checkoutPlan ? getSubscriptionPrice(checkoutPlan, billingCycle) : 0;
  const annualSavings = checkoutPlan ? getAnnualSavingsPercent(checkoutPlan) : 0;

  useEffect(() => {
    if (open) {
      setSelectedPlan(initialPlan);
    } else {
      setSelectedPlan(null);
      setAcceptedTerms(false);
    }
  }, [open, initialPlan]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!checkoutPlan) throw new Error("Select a paid plan to continue.");
      if (!acceptedTerms) throw new Error("Please accept the subscription terms.");

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade",
          plan: checkoutPlan,
          billingCycle,
          paymentMethod,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.errors?.[0]?.message ?? json.message ?? "Checkout failed");
      }

      if (paymentMethod === "paystack") {
        const checkoutUrl = json.data?.checkout?.checkoutUrl as string | undefined;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        throw new Error(json.data?.checkout?.message ?? "Could not start checkout.");
      }

      return json.data;
    },
    onSuccess: () => {
      toast.success(`${planMeta?.name ?? "Plan"} activated`);
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      closeUpgrade();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handlePlanSelect(plan: CheckoutPlanId) {
    if (plan === "FREE") return;
    if (currentPlan === plan && isPaidPlan(currentPlan)) return;
    setSelectedPlan(plan);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeUpgrade()}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto rounded-none border bg-zinc-950 p-0 text-white">
        <DialogHeader className="border-b border-white/10 px-6 py-4">
          <DialogTitle className="text-white">Upgrade your plan</DialogTitle>
        </DialogHeader>

        {!checkoutPlan ? (
          <div className="bg-zinc-950">
            <PricingCardsSection
              mode="checkout"
              compact
              showHeader={false}
              selectedPlan={selectedPlan}
              currentPlan={currentPlan}
              onSelectPlan={handlePlanSelect}
            />
          </div>
        ) : (
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="space-y-4 border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
              <p className="text-sm text-zinc-400">Subscribe to {planMeta?.name}</p>
              <p className="text-4xl font-semibold">
                GHS {price.toFixed(2)}
                <span className="text-base font-normal text-zinc-400">
                  /{billingCycle === "ANNUAL" ? "year" : "month"}
                </span>
              </p>
              <p className="text-sm text-zinc-400">{planMeta?.tagline}</p>
              <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>GHS {price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total due today</span>
                  <span>GHS {price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex gap-2">
                {(["MONTHLY", "ANNUAL"] as const).map((cycle) => (
                  <Button
                    key={cycle}
                    type="button"
                    variant={billingCycle === cycle ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setBillingCycle(cycle)}
                  >
                    {cycle === "MONTHLY" ? "Monthly" : `Annual${annualSavings ? ` · save ${annualSavings}%` : ""}`}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant={paymentMethod === "paystack" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setPaymentMethod("paystack")}
                >
                  Pay with card (Paystack)
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "wallet" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setPaymentMethod("wallet")}
                >
                  Pay from wallet (GHS {walletBalance.toLocaleString()})
                </Button>
              </div>

              <label className="flex items-start gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                I agree to the subscription terms and billing cycle selected above.
              </label>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                  Back
                </Button>
                <Button
                  className="flex-1 bg-white text-black hover:bg-zinc-200"
                  disabled={checkoutMutation.isPending}
                  onClick={() => checkoutMutation.mutate()}
                >
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SidebarUpgradeCard() {
  const { data: session } = useSession();
  const { openUpgrade } = useSubscriptionUpgrade();
  const role = session?.user?.role;

  const { data: profile } = useQuery({
    queryKey: ["sidebar-profile"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      return json.data?.user as {
        fullName?: string | null;
        email?: string;
      } | null;
    },
    enabled: !!session?.user?.id,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      return json.data;
    },
    enabled: !!session?.user,
  });

  const plan = normalizeSubscriptionPlan(subscriptionData?.subscription?.plan ?? "FREE");
  const showCard =
    (role === "LANDLORD" || role === "AGENT") && !isPaidPlan(plan);

  if (!showCard || !session?.user) return null;

  const displayName =
    profile?.fullName?.trim() || session.user.email?.split("@")[0] || "Account";

  return (
    <div className="mx-3 mb-4 rounded-xl border bg-muted/40 p-3">
      <p className="truncate text-sm font-medium">{displayName}</p>
      <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
      <Button
        className="mt-3 w-full justify-start gap-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        onClick={() => openUpgrade("PRO")}
      >
        <Sparkles className="h-4 w-4" />
        Upgrade to Pro+
      </Button>
    </div>
  );
}
