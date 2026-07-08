"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UpgradePlanPicker } from "@/components/subscription/upgrade-plan-picker";
import {
  isPaidPlan,
  normalizeSubscriptionPlan,
  PLAN_CATALOG,
  type CheckoutPlanId,
} from "@/lib/subscription/plans";
import { useSubscriptionUpgrade } from "@/components/subscription/subscription-upgrade-provider";

export function SubscriptionUpgradeDialog() {
  const router = useRouter();
  const { data: session } = useSession();
  const { open, closeUpgrade } = useSubscriptionUpgrade();

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      return json.data;
    },
    enabled: open && !!session?.user,
  });

  const currentPlan = normalizeSubscriptionPlan(
    subscriptionData?.subscription?.plan ?? "FREE"
  );

  function handlePlanSelect(plan: CheckoutPlanId) {
    if (plan === "FREE") return;
    if (currentPlan === plan && isPaidPlan(currentPlan)) return;
    closeUpgrade();
    router.push(`/pricing?plan=${plan}`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeUpgrade()}>
      <DialogContent
        data-surface="subscription-upgrade"
        style={{ backgroundColor: "#ffffff", borderRadius: 0 }}
        className="max-h-[90vh] max-w-5xl overflow-y-auto !rounded-none border border-slate-200 !bg-white p-0 text-slate-900 shadow-xl ring-slate-200 sm:max-w-5xl"
      >
        <DialogHeader className="border-b border-slate-200 px-6 py-5 text-center">
          <DialogTitle className="text-2xl font-semibold text-slate-900">
            Adjust your plan
          </DialogTitle>
          <p className="text-sm text-slate-600">Save 20% when billed annually on checkout</p>
        </DialogHeader>

        <UpgradePlanPicker currentPlan={currentPlan} onSelectPlan={handlePlanSelect} />
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
  const planLabel = PLAN_CATALOG[plan]?.name ?? "Free";
  const showCard = role === "MERCHANT" || role === "MARKETER";

  if (!showCard || !session?.user) return null;

  const displayName =
    profile?.fullName?.trim() || session.user.email?.split("@")[0] || "Account";

  return (
    <div className="mx-3 mb-4 rounded-none border bg-muted/40 p-3">
      <p className="truncate text-sm font-medium">{displayName}</p>
      <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Current plan: <span className="font-medium text-foreground">{planLabel}</span>
      </p>
      {!isPaidPlan(plan) ? (
        <Button
          className="mt-3 w-full justify-start gap-2 rounded-none bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => openUpgrade()}
        >
          <Sparkles className="h-4 w-4" />
          Upgrade
        </Button>
      ) : null}
    </div>
  );
}
