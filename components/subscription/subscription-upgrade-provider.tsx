"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CheckoutPlanId } from "@/lib/subscription/plans";

type SubscriptionUpgradeContextValue = {
  open: boolean;
  initialPlan: CheckoutPlanId | null;
  openUpgrade: (plan?: CheckoutPlanId) => void;
  closeUpgrade: () => void;
};

const SubscriptionUpgradeContext =
  createContext<SubscriptionUpgradeContextValue | null>(null);

export function SubscriptionUpgradeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [initialPlan, setInitialPlan] = useState<CheckoutPlanId | null>(null);

  const openUpgrade = useCallback((plan?: CheckoutPlanId) => {
    setInitialPlan(plan ?? null);
    setOpen(true);
  }, []);

  const closeUpgrade = useCallback(() => {
    setOpen(false);
    setInitialPlan(null);
  }, []);

  const value = useMemo(
    () => ({ open, initialPlan, openUpgrade, closeUpgrade }),
    [open, initialPlan, openUpgrade, closeUpgrade]
  );

  return (
    <SubscriptionUpgradeContext.Provider value={value}>
      {children}
    </SubscriptionUpgradeContext.Provider>
  );
}

export function useSubscriptionUpgrade() {
  const ctx = useContext(SubscriptionUpgradeContext);
  if (!ctx) {
    return {
      open: false,
      initialPlan: null as CheckoutPlanId | null,
      openUpgrade: () => undefined,
      closeUpgrade: () => undefined,
    };
  }
  return ctx;
}
