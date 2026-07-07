export const AGENT_REFERRAL_COOKIE = "agent_ref";

export const AGENT_COMMISSION_RATE =
  Number(process.env.AGENT_COMMISSION_PERCENT ?? "2.5") / 100;

export function calculateAgentCommission(grossAmount: number) {
  return Math.round(grossAmount * AGENT_COMMISSION_RATE * 100) / 100;
}
