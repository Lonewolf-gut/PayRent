import type { PropertyCategory } from "@/lib/subscription-limits";

export type CategoryInterestRates = Record<PropertyCategory, number>;

export type BusinessRules = {
  agentCommissionPercent: number;
  platformFinancingFeePercent: number;
  serviceFeePercent: number;
  commissionFeePercent: number;
  processingFeePercent: number;
  minRepaymentMonths: number;
  maxRepaymentMonths: number;
  maxInterestRatePercent: number;
  maxDebtToIncomePercent: number;
  categoryInterestRates: CategoryInterestRates;
  autoApproveLowRiskFinancing: boolean;
  lenderFreeFinancingLimit: number;
  merchantListingRequiresPaidPlan: boolean;
};

export const DEFAULT_CATEGORY_INTEREST_RATES: CategoryInterestRates = {
  residential: 12,
  car: 15,
  appliance: 18,
};

export const DEFAULT_BUSINESS_RULES: BusinessRules = {
  agentCommissionPercent: Number(process.env.AGENT_COMMISSION_PERCENT ?? "2.5"),
  platformFinancingFeePercent: 2.5,
  serviceFeePercent: Number(process.env.SERVICE_FEE_PERCENT ?? "1.5"),
  commissionFeePercent: Number(process.env.COMMISSION_FEE_PERCENT ?? "2.0"),
  processingFeePercent: Number(process.env.PROCESSING_FEE_PERCENT ?? "0.5"),
  minRepaymentMonths: 6,
  maxRepaymentMonths: 60,
  maxInterestRatePercent: 30,
  maxDebtToIncomePercent: 45,
  categoryInterestRates: { ...DEFAULT_CATEGORY_INTEREST_RATES },
  autoApproveLowRiskFinancing: true,
  lenderFreeFinancingLimit: 100,
  merchantListingRequiresPaidPlan: true,
};
