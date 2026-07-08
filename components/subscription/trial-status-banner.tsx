"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { Clock, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/subscription/pricing";
import { roleRequiresSubscription } from "@/lib/subscription/roles";
import { useSubscriptionUpgrade } from "@/components/subscription/subscription-upgrade-provider";

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

export function TrialStatusBanner({
  className,
  fullWidth = false,
}: {
  className?: string;
  fullWidth?: boolean;
}) {
  const { data: session } = useSession();
  const { openUpgrade } = useSubscriptionUpgrade();
  const [dismissed, setDismissed] = useState(false);
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
  const bannerKind = access?.trialActive
    ? "active"
    : access?.trialExpired
      ? "expired"
      : null;

  const dismissKey =
    session?.user?.id && bannerKind
      ? `trial-banner-dismissed:${session.user.id}:${bannerKind}:${access?.trialEndsAt ?? "none"}`
      : null;

  useEffect(() => {
    if (!dismissKey) {
      setDismissed(false);
      return;
    }
    setDismissed(sessionStorage.getItem(dismissKey) === "true");
  }, [dismissKey]);

  useEffect(() => {
    if (sessionStorage.getItem("fresh-dashboard-login") === "1") {
      setDismissed(false);
    }
  }, [dismissKey, access?.trialEndsAt, bannerKind]);

  const dismissBanner = () => {
    if (!dismissKey) return;
    sessionStorage.setItem(dismissKey, "true");
    setDismissed(true);
  };

  if (!showTrialUi || !access || access.isPaid || dismissed) return null;

  const trialEndLabel = formatTrialEndDate(access.trialEndsAt);
  const daysLeft =
    access.trialActive && access.trialEndsAt
      ? Math.max(0, differenceInCalendarDays(new Date(access.trialEndsAt), new Date()))
      : 0;

  const bannerShellClass = cn(
    "w-full border-2 px-4 py-3.5 text-sm sm:px-6",
    fullWidth ? "rounded-none border-x-0" : "mb-4 rounded-xl",
    className
  );

  if (access.trialActive) {
    return (
      <div
        className={cn(
          bannerShellClass,
          "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
        )}
      >
        <div className="flex items-start gap-3">
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
              <button
                type="button"
                onClick={() => openUpgrade()}
                className="font-medium text-emerald-800 underline underline-offset-2 dark:text-emerald-300"
              >
                Upgrade anytime
              </button>{" "}
              {role === "MARKETER"
                ? "to support more assigned listings after your trial."
                : "to keep listings visible and assign agents after your trial."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900/60 dark:hover:text-emerald-100"
            onClick={dismissBanner}
            aria-label="Dismiss trial notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (access.trialExpired) {
    return (
      <div
        className={cn(
          bannerShellClass,
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
        )}
      >
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Your {TRIAL_DAYS}-day trial has ended</p>
            <p className="mt-1 text-amber-900/75 dark:text-amber-200/80">
              {role === "MARKETER"
                ? "New listing assignments are paused until you upgrade. Existing assignments remain in your dashboard. "
                : "Listings are hidden (not deleted), and agent advertising is paused until you upgrade. "}
              <button
                type="button"
                onClick={() => openUpgrade()}
                className="font-medium text-amber-900 underline underline-offset-2 dark:text-amber-300"
              >
                Choose a plan
              </button>{" "}
              to restore full access.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-amber-900/60 dark:hover:text-amber-100"
            onClick={dismissBanner}
            aria-label="Dismiss subscription notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
