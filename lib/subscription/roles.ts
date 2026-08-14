import type { UserRole } from "@prisma/client";

/** Roles with subscription tiers (merchants, affiliates, lenders). */
export const SUBSCRIPTION_ELIGIBLE_ROLES = [
  "MERCHANT",
  "MARKETER",
  "LENDER",
] as const satisfies readonly UserRole[];

export type SubscriptionEligibleRole = (typeof SUBSCRIPTION_ELIGIBLE_ROLES)[number];

export function roleRequiresSubscription(role: UserRole): role is SubscriptionEligibleRole {
  return (SUBSCRIPTION_ELIGIBLE_ROLES as readonly UserRole[]).includes(role);
}

/** Only merchants receive the introductory subscription trial. */
export function roleGetsSubscriptionTrial(role: UserRole) {
  return role === "MERCHANT";
}

/** Roles with fully free platform access (no subscription product). */
export function roleHasFreePlatformAccess(role: UserRole) {
  return role === "BUYER" || role === "ADMIN" || role === "COMPLIANCE_OFFICER";
}

export function roleUsesLenderFinancingLimit(role: UserRole) {
  return role === "LENDER";
}

export function roleHasUnlimitedBrowse(role: UserRole) {
  return (
    role === "BUYER" ||
    role === "LENDER" ||
    role === "ADMIN" ||
    role === "COMPLIANCE_OFFICER"
  );
}
