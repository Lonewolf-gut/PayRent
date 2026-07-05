import { NextRequest } from "next/server";
import { z } from "zod";
import { paymentService } from "@/lib/services/payment/payment.service";
import { apiResponse, withAuth } from "@/lib/api/handler";
import {
  canDeposit,
  getWalletTypeForRole,
} from "@/lib/wallet/role-wallet";

const paymentSchema = z.object({
  amount: z.number().positive(),
  bankAccountId: z.string().cuid(),
});

/** @deprecated Use POST /api/payments/deposit */
export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  if (!canDeposit(session.user.role)) {
    return apiResponse({ error: "Deposits are not available for this role" }, 403);
  }

  const parsed = paymentSchema.safeParse(await req.json());
  if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

  const walletType = getWalletTypeForRole(session.user.role);
  if (!walletType) return apiResponse({ error: "Invalid role" }, 400);

  const payment = await paymentService.requestWalletDeposit({
    userId: session.user.id,
    walletType,
    amount: parsed.data.amount,
    bankAccountId: parsed.data.bankAccountId,
    description: "PayRent wallet top-up",
  });

  return apiResponse(
    {
      payment,
      message: payment.message,
    },
    payment.status === "FAILED" ? 400 : payment.checkoutUrl ? 200 : 202
  );
});
