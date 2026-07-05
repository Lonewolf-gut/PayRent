"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/subscription/pricing";
import { roleRequiresSubscription } from "@/lib/subscription/roles";

type SubscriptionAccess = {
  trialActive?: boolean;
  trialExpired?: boolean;
  trialEndsAt?: string | null;
  isPaid?: boolean;
  hasFullAccess?: boolean;
};

function formatTrialEndDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "MMM d, yyyy");
}

export function TrialStatusBanner({ className }: { className?: string }) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const showTrialUi = role ? roleRequiresSubscription(role) : false;

  const { data } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      return json.data as { access?: SubscriptionAccess } | null;
    },
    enabled: showTrialUi,
  });

  const access = data?.access;
  if (!showTrialUi || !access || access.isPaid) return null;

  const trialEndLabel = formatTrialEndDate(access.trialEndsAt);
  const daysLeft =
    access.trialActive && access.trialEndsAt
      ? Math.max(0, differenceInCalendarDays(new Date(access.trialEndsAt), new Date()))
      : 0;

  if (access.trialActive) {
    return (
      <div
        className={cn(
          "mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100",
          className
        )}
      >
        <div className="flex flex-wrap items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {daysLeft <= 1
                ? "Your free trial ends today"
                : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your ${TRIAL_DAYS}-day trial`}
            </p>
            <p className="mt-1 text-emerald-900/75 dark:text-emerald-200/80">
              {trialEndLabel
                ? `Full access until ${trialEndLabel}. `
                : "You currently have full platform access. "}
              <Link
                href="/pricing"
                className="font-medium text-emerald-800 underline underline-offset-2 dark:text-emerald-300"
              >
                Upgrade anytime
              </Link>{" "}
              {role === "AGENT"
                ? "to support more assigned listings after your trial."
                : "to keep listings visible and assign agents after your trial."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (access.trialExpired) {
    return (
      <div
        className={cn(
          "mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
          className
        )}
      >
        <div className="flex flex-wrap items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Your {TRIAL_DAYS}-day trial has ended</p>
            <p className="mt-1 text-amber-900/75 dark:text-amber-200/80">
              {role === "AGENT"
                ? "New listing assignments are paused until you upgrade. Existing assignments remain in your dashboard. "
                : "Listings are hidden (not deleted), and agent advertising is paused until you upgrade. "}
              <Link
                href="/pricing"
                className="font-medium text-amber-900 underline underline-offset-2 dark:text-amber-300"
              >
                Choose a plan
              </Link>{" "}
              to restore full access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
