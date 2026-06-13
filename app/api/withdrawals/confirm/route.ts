import { NextRequest } from "next/server";
import { z } from "zod";
import { withdrawalService } from "@/lib/services/withdrawal.service";
import { twoFactorService } from "@/lib/services/two-factor.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

const confirmSchema = z.object({
  withdrawalId: z.string().cuid(),
  twoFaToken: z.string().min(6).max(6),
});

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    await twoFactorService.validateToken(session.user.id, parsed.data.twoFaToken);

    const withdrawal = await withdrawalService.confirmWithdrawal(
      session.user.id,
      session.user.role,
      parsed.data.withdrawalId,
      true
    );
    return apiResponse(withdrawal, 200, "Withdrawal completed.");
  },
  { roles: ["LENDER", "LANDLORD"], permission: "wallet:withdraw" }
);
