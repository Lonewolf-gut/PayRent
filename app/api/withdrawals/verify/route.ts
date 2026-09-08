import { NextRequest } from "next/server";
import { z } from "zod";
import { withdrawalService } from "@/lib/services/withdrawal.service";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { WITHDRAW_ROLES } from "@/lib/wallet/role-wallet";

const verifySchema = z.object({
  withdrawalId: z.string().cuid(),
  code: z.string().min(4),
});

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    const withdrawal = await withdrawalService.verifyOtp(
      session.user.id,
      parsed.data.withdrawalId,
      parsed.data.code
    );
    return apiResponse(withdrawal, 200, "OTP verified. Complete with 2FA.");
  },
  { roles: WITHDRAW_ROLES, permission: "wallet:withdraw" }
);
