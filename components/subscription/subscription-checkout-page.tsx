"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Wallet } from "lucide-react";
import { toast } from "sonner";
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
import { TrialStatusBanner } from "@/components/subscription/trial-status-banner";
import { roleRequiresSubscription } from "@/lib/subscription/roles";
import { DASHBOARD_ROUTES } from "@/lib/auth/permissions";

type BillingCycle = "MONTHLY" | "ANNUAL";
type PaymentMethod = "wallet" | "paystack";

function formatAmount(amount: number) {
  return `GHS ${amount.toFixed(2)}`;
}

export function SubscriptionCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session, status: sessionStatus } = useSession();

  const initialPlan = searchParams.get("plan");
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlanId | null>(
    initialPlan === "PRO" || initialPlan === "MAX" ? initialPlan : null
  );
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
    enabled: !!session?.user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data as { balance?: number | string } | null;
    },
    enabled: !!session?.user,
  });

  const currentPlan = normalizeSubscriptionPlan(
    subscriptionData?.subscription?.plan ?? "FREE"
  );
  const walletBalance = Number(wallet?.balance ?? 0);

  const checkoutPlan = selectedPlan && selectedPlan !== "FREE" ? selectedPlan : null;
  const planMeta = checkoutPlan ? PLAN_CATALOG[checkoutPlan] : null;
  const price = checkoutPlan
    ? getSubscriptionPrice(checkoutPlan, billingCycle)
    : 0;
  const annualSavings = checkoutPlan ? getAnnualSavingsPercent(checkoutPlan) : 0;
  const cycleLabel = billingCycle === "ANNUAL" ? "year" : "month";

  const role = session?.user?.role;
  const canSubscribe = role ? roleRequiresSubscription(role) : true;

  const walletPath = useMemo(() => {
    if (role === "AGENT") return "/dashboard/agent/wallet";
    return "/dashboard/landlord/wallet";
  }, [role]);

  useEffect(() => {
    if (initialPlan === "PRO" || initialPlan === "MAX") {
      setSelectedPlan(initialPlan);
    }
  }, [initialPlan]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!checkoutPlan) throw new Error("Select a paid plan to continue.");
      if (!session?.user) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/pricing?plan=${checkoutPlan}`)}`);
        return;
      }
      if (!acceptedTerms) {
        throw new Error("Please accept the subscription terms to continue.");
      }

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
        const message = json.errors?.[0]?.message ?? json.message ?? "Checkout failed";
        throw new Error(message);
      }

      if (paymentMethod === "paystack") {
        const checkoutUrl = json.data?.checkout?.checkoutUrl as string | undefined;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        throw new Error(json.data?.checkout?.message ?? "Could not start Paystack checkout.");
      }

      return json.data;
    },
    onSuccess: () => {
      toast.success(`${planMeta?.name ?? "Plan"} activated — payment taken from your wallet`);
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      router.push("/dashboard");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function handlePlanSelect(plan: CheckoutPlanId) {
    if (plan === "FREE") {
      if (session?.user) {
        toast.message("You're on the free plan. Cancel a paid plan in settings to downgrade.");
        return;
      }
      router.push("/register");
      return;
    }

    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/pricing?plan=${plan}`)}`);
      return;
    }

    setSelectedPlan(plan);
    router.replace(`/pricing?plan=${plan}`, { scroll: false });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function clearCheckout() {
    setSelectedPlan(null);
    router.replace("/pricing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isCurrentPaidPlan =
    checkoutPlan !== null && currentPlan === checkoutPlan && isPaidPlan(currentPlan);

  if (sessionStatus === "authenticated" && role && !canSubscribe) {
    const dashboardPath = DASHBOARD_ROUTES[role] ?? "/dashboard";
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-bold text-emerald-950">No subscription required</h1>
        <p className="mt-4 text-muted-foreground">
          {role === "TENANT"
            ? "Tenant accounts have free access to browse listings, apply for properties, and request rent financing."
            : "Lender accounts have free access to the full financing pipeline — review, approve, and monitor deals at no monthly cost."}
        </p>
        <Button asChild className="mt-8 bg-emerald-600 hover:bg-emerald-700">
          <Link href={dashboardPath}>Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {session?.user && canSubscribe ? (
        <div className="border-b border-emerald-200 bg-emerald-100/70">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <TrialStatusBanner className="mb-0" />
          </div>
        </div>
      ) : null}

      {!checkoutPlan ? (
        <PricingCardsSection
          mode="checkout"
          selectedPlan={selectedPlan}
          currentPlan={currentPlan}
          onSelectPlan={handlePlanSelect}
          showHeader
        />
      ) : null}

      {checkoutPlan && planMeta ? (
        <section id="checkout" className="border-t border-emerald-100 bg-white py-12 sm:py-16 lg:border-t-0">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <button
              type="button"
              onClick={clearCheckout}
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-emerald-800 hover:text-emerald-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to plans
            </button>

            <h2 className="font-serif text-3xl font-bold text-emerald-950">{planMeta.name} plan</h2>
            <p className="mt-2 text-emerald-900/70">
              Choose billing, review your order, then pay from wallet or direct checkout.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(["MONTHLY", "ANNUAL"] as const).map((cycle) => {
                const amount = getSubscriptionPrice(checkoutPlan, cycle);
                const selected = billingCycle === cycle;
                return (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-emerald-100 bg-white hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-emerald-950">
                          {cycle === "MONTHLY" ? "Monthly" : "Yearly"}
                        </p>
                        <p className="mt-2 text-sm text-emerald-900/70">
                          {formatAmount(amount)}
                          {cycle === "MONTHLY" ? "/month" : "/year"}
                        </p>
                      </div>
                      {cycle === "ANNUAL" && annualSavings > 0 ? (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                          Save {annualSavings}%
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-6">
              <h3 className="text-lg font-semibold text-emerald-950">Order details</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-emerald-900/80">
                  <span>
                    {planMeta.name} plan{" "}
                    {billingCycle === "ANNUAL" ? "Annually" : "Monthly"}
                  </span>
                  <span>{formatAmount(price)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-900/80">
                  <span>Subtotal</span>
                  <span>{formatAmount(price)}</span>
                </div>
                <div className="border-t border-emerald-100 pt-3">
                  <div className="flex items-center justify-between text-base font-semibold text-emerald-950">
                    <span>Total due today</span>
                    <span>{formatAmount(price)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-emerald-950">Payment</h3>

              {session?.user?.email ? (
                <div className="mt-5">
                  <p className="text-sm text-emerald-900/70">Email</p>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/30 px-4 py-3 text-sm">
                    <span className="text-emerald-950">{session.user.email}</span>
                    <Link href="/dashboard" className="font-medium text-emerald-700 hover:text-emerald-900">
                      Account
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="mt-6">
                <p className="text-sm text-emerald-900/70">Payment method</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                      paymentMethod === "paystack"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-emerald-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paystack"
                      checked={paymentMethod === "paystack"}
                      onChange={() => setPaymentMethod("paystack")}
                      className="mt-1 accent-emerald-600"
                    />
                    <div>
                      <p className="font-medium text-emerald-950">Pay direct</p>
                      <p className="mt-1 text-sm text-emerald-900/65">
                        Card, bank transfer, or Mobile Money via Paystack
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                      paymentMethod === "wallet"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-emerald-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="wallet"
                      checked={paymentMethod === "wallet"}
                      onChange={() => setPaymentMethod("wallet")}
                      className="mt-1 accent-emerald-600"
                    />
                    <div>
                      <p className="flex items-center gap-2 font-medium text-emerald-950">
                        <Wallet className="h-4 w-4" />
                        Pay from wallet
                      </p>
                      <p className="mt-1 text-sm text-emerald-900/65">
                        Balance: {formatAmount(walletBalance)}
                        {walletBalance < price ? (
                          <>
                            {" "}
                            ·{" "}
                            <Link href={walletPath} className="font-medium text-emerald-700 underline">
                              Top up wallet
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-emerald-300 accent-emerald-600"
                />
                <label htmlFor="terms" className="text-sm leading-6 text-emerald-900/75">
                  You agree that PayForMe will charge {formatAmount(price)} now and on a recurring{" "}
                  {cycleLabel}ly basis until you cancel. See our{" "}
                  <Link href="/terms" className="font-medium text-emerald-700 underline">
                    terms
                  </Link>
                  .
                </label>
              </div>

              <Button
                className="mt-6 h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700"
                disabled={
                  checkoutMutation.isPending ||
                  isCurrentPaidPlan ||
                  (paymentMethod === "wallet" && walletBalance < price) ||
                  sessionStatus === "loading"
                }
                onClick={() => checkoutMutation.mutate()}
              >
                {isCurrentPaidPlan
                  ? `${planMeta.name} plan already active`
                  : checkoutMutation.isPending
                    ? "Processing…"
                    : `Subscribe to ${planMeta.name}`}
              </Button>

              <p className="mt-3 text-center text-xs text-emerald-800/60">
                No commitment · Cancel anytime from your account settings
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
