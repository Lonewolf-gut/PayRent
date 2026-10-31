import type { BillingCycle, SubscriptionPlan } from "@prisma/client";

export const TRIAL_DAYS = 7;

export const PLAN_PRICES: Record<
  SubscriptionPlan,
  { monthly: number; annual: number }
> = {
  FREE: { monthly: 0, annual: 0 },
  PRO: { monthly: 49.99, annual: 499 },
  MAX: { monthly: 99.99, annual: 999 },
  PREMIUM: { monthly: 99.99, annual: 999 },
};

export function getSubscriptionPrice(
  plan: SubscriptionPlan,
  billingCycle: BillingCycle
) {
  const prices = PLAN_PRICES[plan];
  return billingCycle === "ANNUAL" ? prices.annual : prices.monthly;
}
