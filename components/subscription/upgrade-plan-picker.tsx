"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHECKOUT_PLANS,
  PLAN_CATALOG,
  type CheckoutPlanId,
} from "@/lib/subscription/plans";
import { getSubscriptionPrice } from "@/lib/subscription/pricing";
import { cn } from "@/lib/utils";

function formatPrice(planId: CheckoutPlanId) {
  if (planId === "FREE") return "Free";
  return `GHS ${getSubscriptionPrice(planId, "MONTHLY").toFixed(2)}`;
}

export function UpgradePlanPicker({
  currentPlan,
  onSelectPlan,
  isDark = false,
}: {
  currentPlan: CheckoutPlanId;
  onSelectPlan: (plan: CheckoutPlanId) => void;
  isDark?: boolean;
}) {
  return (
    <div className="grid gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6">
      {CHECKOUT_PLANS.map((planId) => {
        const plan = PLAN_CATALOG[planId];
        const isCurrent = currentPlan === planId;
        const isHighlight = plan.highlight;

        return (
          <div
            key={planId}
            data-plan-card={isHighlight ? "highlight" : "default"}
            className={cn(
              "flex flex-col !rounded-none border p-5",
              isHighlight
                ? "border-emerald-600 bg-gradient-to-b from-emerald-600 to-emerald-700"
                : isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-50"
                  : "border-border bg-card text-card-foreground"
            )}
          >
            <div className="mb-3 flex min-h-[24px] items-center gap-2">
              {isHighlight ? (
                <span className="rounded-none bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-900">
                  MOST POPULAR
                </span>
              ) : null}
              {isCurrent ? (
                <span
                  className={cn(
                    "rounded-none border px-2 py-0.5 text-[10px] font-bold tracking-wide",
                    isDark
                      ? "border-white/15 text-zinc-300"
                      : "border-border text-muted-foreground"
                  )}
                >
                  CURRENT PLAN
                </span>
              ) : null}
            </div>

            <h3
              className={cn(
                "text-lg font-semibold",
                isHighlight ? "text-white" : isDark ? "text-zinc-50" : "text-foreground"
              )}
            >
              {plan.name}
            </h3>
            <p
              className={cn(
                "mt-1 text-sm",
                isHighlight
                  ? "text-emerald-50/90"
                  : isDark
                    ? "text-zinc-300"
                    : "text-muted-foreground"
              )}
            >
              {plan.tagline}
            </p>
            <p
              className={cn(
                "mt-4 text-2xl font-bold",
                isHighlight ? "text-white" : isDark ? "text-zinc-50" : "text-foreground"
              )}
            >
              {formatPrice(planId)}
              {planId !== "FREE" ? (
                <span
                  className={cn(
                    "text-sm font-normal",
                    isHighlight
                      ? "text-emerald-100"
                      : isDark
                        ? "text-zinc-400"
                        : "text-muted-foreground"
                  )}
                >
                  {" "}
                  /mo
                </span>
              ) : null}
            </p>

            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.slice(0, 4).map((feature) => (
                <li
                  key={feature}
                  className={cn(
                    "flex items-start gap-2 text-xs leading-relaxed",
                    isHighlight
                      ? "text-emerald-50"
                      : isDark
                        ? "text-zinc-300"
                        : "text-muted-foreground"
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      isHighlight
                        ? "text-emerald-100"
                        : isDark
                          ? "text-emerald-400"
                          : "text-emerald-600"
                    )}
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              className={cn(
                "mt-5 w-full !rounded-none",
                isCurrent
                  ? isDark
                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-800"
                    : "bg-muted text-muted-foreground hover:bg-muted"
                  : isHighlight
                    ? "bg-white text-emerald-800 hover:bg-emerald-50"
                    : isDark
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-foreground text-background hover:bg-foreground/90"
              )}
              disabled={isCurrent}
              onClick={() => onSelectPlan(planId)}
            >
              {planId === "FREE"
                ? "Your current plan"
                : isCurrent
                  ? "Your current plan"
                  : "Choose plan"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
