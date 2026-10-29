import { z } from "zod";

export const businessRulesPatchSchema = z.object({
  agentCommissionPercent: z.number().min(0).max(100).optional(),
  platformFinancingFeePercent: z.number().min(0).max(100).optional(),
  serviceFeePercent: z.number().min(0).max(100).optional(),
  commissionFeePercent: z.number().min(0).max(100).optional(),
  processingFeePercent: z.number().min(0).max(100).optional(),
  minRepaymentMonths: z.number().int().min(1).max(120).optional(),
  maxRepaymentMonths: z.number().int().min(1).max(120).optional(),
  maxInterestRatePercent: z.number().min(0).max(100).optional(),
  maxDebtToIncomePercent: z.number().min(1).max(100).optional(),
  autoApproveLowRiskFinancing: z.boolean().optional(),
  lenderFreeFinancingLimit: z.number().int().min(1).max(10000).optional(),
  merchantListingRequiresPaidPlan: z.boolean().optional(),
});
