import type { UserRole } from "@prisma/client";

/** Roles that require a paid subscription after the trial period. */
export const SUBSCRIPTION_ELIGIBLE_ROLES = ["LANDLORD", "AGENT"] as const satisfies readonly UserRole[];

export type SubscriptionEligibleRole = (typeof SUBSCRIPTION_ELIGIBLE_ROLES)[number];

export function roleRequiresSubscription(role: UserRole): role is SubscriptionEligibleRole {
  return (SUBSCRIPTION_ELIGIBLE_ROLES as readonly UserRole[]).includes(role);
}

export function roleHasFreePlatformAccess(role: UserRole) {
  return !roleRequiresSubscription(role);
}
