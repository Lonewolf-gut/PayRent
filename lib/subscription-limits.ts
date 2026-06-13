import type { PropertyType, SubscriptionPlan } from "@prisma/client";

export const FREE_PLAN_LIMITS = {
  residential: 10,
  cars: 5,
  appliances: 5,
  total: 20,
} as const;

export const RESIDENTIAL_TYPES: PropertyType[] = [
  "APARTMENT",
  "HOUSE",
  "CONDO",
  "TOWNHOUSE",
  "STUDIO",
  "COMMERCIAL",
];

export function getPropertyCategory(
  type: PropertyType
): "residential" | "car" | "appliance" {
  if (type === "CAR") return "car";
  if (type === "APPLIANCE") return "appliance";
  return "residential";
}

export function isUnlimitedPlan(plan?: SubscriptionPlan | null) {
  return plan === "PREMIUM";
}
