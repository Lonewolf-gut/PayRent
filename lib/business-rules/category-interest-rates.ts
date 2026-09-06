import type { PropertyType } from "@prisma/client";
import type { PropertyCategory } from "@/lib/subscription-limits";
import { getPropertyCategory } from "@/lib/subscription-limits";
import type { BusinessRules } from "@/lib/business-rules/types";

export const CATEGORY_INTEREST_RATE_LABELS: Record<PropertyCategory, string> = {
  residential: "Houses & rooms",
  car: "Cars",
  appliance: "Home appliances",
};

export function getInterestRateForCategory(
  rules: BusinessRules,
  category: PropertyCategory
): number {
  return rules.categoryInterestRates[category];
}

export function getInterestRateForPropertyType(
  rules: BusinessRules,
  propertyType: PropertyType
): number {
  return getInterestRateForCategory(rules, getPropertyCategory(propertyType));
}
