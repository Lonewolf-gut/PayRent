import { AGENT_REFERRAL_COOKIE } from "@/lib/constants/agent-commission";

export function parseAgentReferralCode(cookieHeader?: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${AGENT_REFERRAL_COOKIE}=`)) {
      const value = decodeURIComponent(part.slice(AGENT_REFERRAL_COOKIE.length + 1));
      return value || null;
    }
  }
  return null;
}

export function buildReferralUrl(origin: string, code: string, propertyId?: string) {
  const base = propertyId ? `${origin}/properties/${propertyId}` : origin;
  const url = new URL(base);
  url.searchParams.set("ref", code);
  return url.toString();
}
