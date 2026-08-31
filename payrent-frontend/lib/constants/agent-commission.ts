export { AGENT_REFERRAL_COOKIE } from "@/lib/constants/agent-referral-cookie";

import { getBusinessRulesSync } from "@/lib/services/business-rules.service";

export function getAgentCommissionRate() {
  return getBusinessRulesSync().agentCommissionPercent / 100;
}

export function calculateAgentCommission(grossAmount: number) {
  return Math.round(grossAmount * getAgentCommissionRate() * 100) / 100;
}
