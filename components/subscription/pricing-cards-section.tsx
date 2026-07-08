"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import {
  CHECKOUT_PLANS,
  PLAN_CATALOG,
  type CheckoutPlanId,
} from "@/lib/subscription/plans";
import { getSubscriptionPrice } from "@/lib/subscription/pricing";

type PricingCardsSectionProps = {
  mode?: "marketing" | "checkout" | "modal";
  selectedPlan?: CheckoutPlanId | null;
  currentPlan?: CheckoutPlanId;
  onSelectPlan?: (plan: CheckoutPlanId) => void;
  showHeader?: boolean;
  compact?: boolean;
};

function formatMonthlyPrice(planId: CheckoutPlanId) {
  if (planId === "FREE") return "Free";
  const amount = getSubscriptionPrice(planId, "MONTHLY");
  return `GHS ${amount.toFixed(2)}`;
}

export function PricingCardsSection({
  mode = "marketing",
  selectedPlan = null,
  currentPlan = "FREE",
  onSelectPlan,
  showHeader = true,
  compact = false,
}: PricingCardsSectionProps) {
  const isCheckout = mode === "checkout";
  const isModal = mode === "modal";
  const isDarkSurface = mode === "marketing" || isModal;

  return (
    <section
      id={mode === "marketing" ? "pricing" : undefined}
      className={
        isCheckout
          ? `bg-gradient-to-b from-emerald-100 via-emerald-50 to-emerald-100 text-emerald-950 ${compact ? "py-12" : "py-20"}`
          : isModal
            ? `bg-zinc-950 text-white ${compact ? "py-8" : "py-12"}`
            : `bg-emerald-950 text-white ${compact ? "py-12" : "py-20"}`
      }
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {showHeader ? (
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p
              className={`mx-auto mt-4 max-w-2xl ${
                isCheckout ? "text-emerald-800/75" : "text-emerald-100/75"
              }`}
            >
              Plans for merchants and Affiliates. Customers and lenders use PayForMe for free.
            </p>
          </div>
        ) : null}

        <div
          className={`mx-auto grid gap-6 ${
            compact ? "mt-8 max-w-6xl lg:grid-cols-3" : "mt-12 max-w-6xl lg:grid-cols-3"
          }`}
        >
          {CHECKOUT_PLANS.map((planId) => {
            const plan = PLAN_CATALOG[planId];
            const isCurrent = currentPlan === planId;
            const isSelected = selectedPlan === planId;
            const monthlyPrice = formatMonthlyPrice(planId);

            return (
              <div
                key={planId}
                className={`relative flex flex-col rounded-xl p-8 ${
                  isSelected
                    ? isCheckout
                      ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-emerald-50"
                      : "ring-2 ring-emerald-300 ring-offset-2 ring-offset-emerald-950"
                    : ""
                } ${
                  isCheckout
                    ? plan.highlight
                      ? "border border-emerald-500 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/15"
                      : "border border-emerald-200 bg-white/90 shadow-sm backdrop-blur-sm"
                    : isDarkSurface
                      ? plan.highlight
                        ? "border border-emerald-400 bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-[0_20px_40px_rgba(16,185,129,0.25)]"
                        : isModal
                          ? "border border-zinc-700 bg-zinc-900/80"
                          : "border border-emerald-800/60 bg-emerald-900/40 backdrop-blur-sm"
                      : ""
                }`}
              >
                <div className="mb-6 flex min-h-[26px] flex-wrap items-center gap-2">
                  {plan.highlight ? (
                    <span
                      className={`inline-flex rounded-sm px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] ${
                        isCheckout
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-300 text-emerald-950"
                      }`}
                    >
                      MOST POPULAR
                    </span>
                  ) : (
                    <span className="block h-[26px]" aria-hidden />
                  )}
                  {isCurrent && (mode === "checkout" || isModal) ? (
                    <span
                      className={`inline-flex rounded-sm border px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] ${
                        isCheckout
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      CURRENT PLAN
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold">{plan.name}</h3>
                  <p
                    className={`mt-1 text-sm ${
                      isCheckout
                        ? plan.highlight
                          ? "text-emerald-50/90"
                          : "text-emerald-800/70"
                        : isDarkSurface
                          ? plan.highlight
                            ? "text-emerald-50/90"
                            : isModal
                              ? "text-zinc-400"
                              : "text-emerald-100/60"
                          : ""
                    }`}
                  >
                    {plan.tagline}
                  </p>
                  <p className="mt-6 font-serif text-4xl font-bold tracking-tight">
                    {monthlyPrice}
                    {planId !== "FREE" ? (
                      <span
                        className={`text-base font-sans font-normal ${
                          isCheckout
                            ? plan.highlight
                              ? "text-emerald-50/80"
                              : "text-emerald-700/60"
                            : isDarkSurface
                              ? plan.highlight
                                ? "text-emerald-50/80"
                                : isModal
                                  ? "text-zinc-500"
                                  : "text-emerald-100/50"
                              : ""
                        }`}
                      >
                        {" "}
                        / per month
                      </span>
                    ) : null}
                  </p>
                </div>

                <div
                  className={`my-8 border-t ${
                    isCheckout
                      ? plan.highlight
                        ? "border-emerald-400/40"
                        : "border-emerald-200"
                      : isDarkSurface
                        ? plan.highlight
                          ? "border-emerald-400/40"
                          : isModal
                            ? "border-zinc-700"
                            : "border-emerald-800/60"
                        : ""
                  }`}
                />

                {plan.includesLabel ? (
                  <p
                    className={`mb-4 text-sm ${
                      isCheckout
                        ? plan.highlight
                          ? "text-emerald-50/85"
                          : "text-emerald-800/70"
                        : plan.highlight
                          ? "text-emerald-50/85"
                          : "text-emerald-100/70"
                    }`}
                  >
                    {plan.includesLabel}
                  </p>
                ) : null}

                <ul className="flex-1 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-3 text-sm ${
                        isCheckout
                          ? plan.highlight
                            ? "text-emerald-50"
                            : "text-emerald-900/80"
                          : plan.highlight
                            ? "text-emerald-50"
                            : "text-emerald-100/85"
                      }`}
                    >
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isCheckout
                            ? plan.highlight
                              ? "text-emerald-100"
                              : "text-emerald-600"
                            : plan.highlight
                              ? "text-emerald-100"
                              : "text-emerald-400"
                        }`}
                        strokeWidth={1.5}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {mode === "marketing" ? (
                  <Link
                    href={
                      planId === "FREE"
                        ? "/register"
                        : `/pricing?plan=${planId}`
                    }
                    className={`mt-8 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                      plan.highlight
                        ? "border border-emerald-500/50 bg-emerald-800/40 text-white hover:bg-emerald-800/60"
                        : "bg-white text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {planId === "FREE" ? "Get Started" : `Get ${plan.name} plan`}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`mt-8 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                      isCheckout
                        ? plan.highlight
                          ? "bg-white text-emerald-700 hover:bg-emerald-50"
                          : "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : plan.highlight
                          ? "bg-white text-emerald-700 hover:bg-emerald-50"
                          : "border border-emerald-600/50 text-white hover:border-emerald-500 hover:bg-emerald-800/50"
                    }`}
                    onClick={() => onSelectPlan?.(planId)}
                  >
                    {planId === "FREE"
                      ? "Use Free plan"
                      : isModal
                        ? isCurrent
                          ? "Your current plan"
                          : "Choose plan"
                        : `Get ${plan.name} plan`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {mode === "marketing" ? (
          <div className="mx-auto mt-10 max-w-6xl text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
            >
              Compare plans and checkout
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
