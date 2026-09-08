import type { EntityType } from "@prisma/client";

export function getProfileDisplayName(params: {
  entityType?: EntityType | string | null;
  fullName?: string | null;
  companyName?: string | null;
}): string | null {
  if (params.entityType === "COMPANY" && params.companyName?.trim()) {
    return params.companyName.trim();
  }
  return params.fullName?.trim() ?? null;
}
