export const AGENT_REFERRAL_COOKIE = "agent_ref";

import { getBusinessRulesSync } from "@/lib/services/business-rules.service";

export function getAgentCommissionRate() {
  return getBusinessRulesSync().agentCommissionPercent / 100;
}

export function calculateAgentCommission(grossAmount: number) {
  return Math.round(grossAmount * getAgentCommissionRate() * 100) / 100;
}
