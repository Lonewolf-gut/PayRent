import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_BUSINESS_RULES,
  DEFAULT_CATEGORY_INTEREST_RATES,
  type BusinessRules,
} from "@/lib/business-rules/types";

const CONFIG_ID = "default";
let cachedRules: BusinessRules | null = null;

function mergeRules(partial?: Record<string, unknown> | null): BusinessRules {
  if (!partial || typeof partial !== "object") {
    return { ...DEFAULT_BUSINESS_RULES };
  }

  const categoryInterestRates =
    partial.categoryInterestRates &&
    typeof partial.categoryInterestRates === "object"
      ? {
          ...DEFAULT_CATEGORY_INTEREST_RATES,
          ...Object.fromEntries(
            Object.entries(partial.categoryInterestRates as Record<string, unknown>).filter(
              ([, value]) => value !== undefined
            )
          ),
        }
      : DEFAULT_CATEGORY_INTEREST_RATES;

  return {
    ...DEFAULT_BUSINESS_RULES,
    ...Object.fromEntries(
      Object.entries(partial).filter(
        ([key, value]) => value !== undefined && key !== "categoryInterestRates"
      )
    ),
    categoryInterestRates,
  } as BusinessRules;
}

export class BusinessRulesService {
  async getRules(): Promise<BusinessRules> {
    const row = await prisma.businessRuleConfig.findUnique({
      where: { id: CONFIG_ID },
    });
    cachedRules = mergeRules(row?.rules as Record<string, unknown> | null);
    return cachedRules;
  }

  getRulesSync(): BusinessRules {
    return cachedRules ?? DEFAULT_BUSINESS_RULES;
  }

  async updateRules(
    patch: Partial<BusinessRules>,
    updatedByUserId?: string
  ): Promise<BusinessRules> {
    const current = await this.getRules();
    const next = mergeRules({ ...current, ...patch });

    if (next.minRepaymentMonths > next.maxRepaymentMonths) {
      throw new Error("Minimum repayment period cannot exceed maximum.");
    }

    for (const rate of Object.values(next.categoryInterestRates)) {
      if (rate > next.maxInterestRatePercent) {
        throw new Error(
          `Category interest rates cannot exceed the platform maximum of ${next.maxInterestRatePercent}%.`
        );
      }
    }

    await prisma.businessRuleConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        rules: next,
        updatedByUserId: updatedByUserId ?? null,
      },
      update: {
        rules: next,
        updatedByUserId: updatedByUserId ?? null,
      },
    });

    cachedRules = next;
    return next;
  }
}

export const businessRulesService = new BusinessRulesService();

export async function getBusinessRules() {
  return businessRulesService.getRules();
}

export function getBusinessRulesSync() {
  return businessRulesService.getRulesSync();
}
