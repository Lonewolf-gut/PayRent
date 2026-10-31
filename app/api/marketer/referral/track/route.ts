import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withPublicHandler } from "@/lib/api/handler";
import { agentReferralService } from "@/lib/services/agent-referral.service";
import { AGENT_REFERRAL_COOKIE } from "@/lib/constants/agent-commission";
import { getReferralCodeFromRequest } from "@/lib/utils/agent-referral-request";

export const POST = withPublicHandler(async (req: NextRequest) => {
  const code = getReferralCodeFromRequest(req);
  if (!code) {
    return NextResponse.json({
      success: true,
      message: "No referral code provided.",
      data: { tracked: false },
      errors: null,
      requestId: randomUUID(),
    });
  }

  const link = await agentReferralService.trackClick(code);
  const response = NextResponse.json({
    success: true,
    message: "Referral tracked.",
    data: { tracked: Boolean(link), code: link?.code ?? code },
    errors: null,
    requestId: randomUUID(),
  });

  if (link) {
    response.cookies.set(AGENT_REFERRAL_COOKIE, link.code, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  return response;
});
