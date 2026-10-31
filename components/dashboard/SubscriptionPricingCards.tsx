"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard } from "lucide-react";

const plans = [
  {
    id: "FREE",
    name: "Starter",
    subtitle: "Free plan for small merchants",
    price: "Free",
    period: null as string | null,
    highlight: false,
    features: [
      "Up to 10 houses/apartments",
      "Up to 5 cars & appliances",
      "Basic marketplace access",
      "Email support",
    ],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    subtitle: "For growing property management companies",
    price: "GHS 79.99",
    period: "per month",
    annualPrice: "GHS 799.99",
    highlight: true,
    features: [
      "Unlimited listings and browsing",
      "Priority financing review",
      "Premium placement in search",
      "Advanced support",
      "Customer & resident portal",
    ],
  },
];

export function SubscriptionPricingCards({
  upgradeOnly = false,
}: {
  upgradeOnly?: boolean;
}) {
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      return json.data;
    },
  });

  const currentPlan = subscription?.subscription?.plan ?? "FREE";

  const visiblePlans = upgradeOnly
    ? plans.filter((plan) => plan.id !== "FREE")
    : plans;

  return (
    <div
      className={
        upgradeOnly
          ? ""
          : "overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-950 p-6 text-white sm:p-8"
      }
    >
      <div
        className={
          upgradeOnly
            ? "mx-auto max-w-md"
            : "grid gap-6 md:grid-cols-2"
        }
      >
        {visiblePlans.map((plan) => {
          const isCurrent = currentPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl p-8 ${
                isCurrent
                  ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-emerald-950"
                  : ""
              } ${
                plan.highlight
                  ? "border border-emerald-400 bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-[0_20px_40px_rgba(16,185,129,0.25)]"
                  : "border border-emerald-800/60 bg-emerald-900/40"
              }`}
            >
              <div className="mb-6 flex min-h-[26px] flex-wrap items-center gap-2">
                {plan.highlight ? (
                  <span className="inline-flex rounded-sm bg-emerald-300 px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] text-emerald-950">
                    MOST POPULAR
                  </span>
                ) : null}
                {isCurrent ? (
                  <span className="inline-flex rounded-sm border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-emerald-300">
                    CURRENT PLAN
                  </span>
                ) : null}
              </div>

              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p
                  className={`mt-1 text-sm ${plan.highlight ? "text-emerald-50/90" : "text-emerald-100/60"}`}
                >
                  {plan.subtitle}
                </p>
                <p className="mt-6 text-4xl font-bold tracking-tight">
                  {plan.price}
                  {plan.period ? (
                    <span
                      className={`text-base font-normal ${plan.highlight ? "text-emerald-50/80" : "text-emerald-100/50"}`}
                    >
                      {" "}
                      / {plan.period}
                    </span>
                  ) : null}
                </p>
              </div>

              <div
                className={`my-8 border-t ${plan.highlight ? "border-emerald-400/40" : "border-emerald-800/60"}`}
              />

              <ul className="flex-1 space-y-3.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-start gap-3 text-sm ${plan.highlight ? "text-emerald-50" : "text-emerald-100/85"}`}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-emerald-100" : "text-emerald-400"}`}
                      strokeWidth={1.5}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.id === "PREMIUM" && !isCurrent ? (
                <div className="mt-8 space-y-3">
                  <p className="flex items-center justify-center gap-2 text-center text-xs text-emerald-50/80">
                    <CreditCard className="size-3.5" />
                    Pay with verified Mobile Money
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href="/pricing?plan=PREMIUM"
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Subscribe monthly
                    </Link>
                    <Link
                      href="/pricing?plan=PREMIUM"
                      className="inline-flex flex-1 items-center justify-center rounded-md border border-emerald-600/50 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-emerald-500 hover:bg-emerald-800/50"
                    >
                      Subscribe annually
                    </Link>
                  </div>
                </div>
              ) : plan.id === "FREE" && isCurrent ? (
                <p className="mt-8 text-center text-sm text-emerald-100/60">
                  You&apos;re on the free plan
                </p>
              ) : plan.id === "PREMIUM" && isCurrent ? (
                <p className="mt-8 text-center text-sm font-medium text-emerald-300">
                  Premium active
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
