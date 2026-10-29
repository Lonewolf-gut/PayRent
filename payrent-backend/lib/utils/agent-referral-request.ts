import type { NextRequest } from "next/server";
import { agentReferralService } from "@/lib/services/agent-referral.service";
import { parseAgentReferralCode } from "@/lib/utils/agent-referral";

export async function getReferralAgentProfileId(req: NextRequest) {
  const code = parseAgentReferralCode(req.headers.get("cookie"));
  return agentReferralService.resolveAgentProfileId(code);
}

export function getReferralCodeFromRequest(req: NextRequest) {
  const fromQuery = req.nextUrl.searchParams.get("ref");
  if (fromQuery) return fromQuery;
  return parseAgentReferralCode(req.headers.get("cookie"));
}
