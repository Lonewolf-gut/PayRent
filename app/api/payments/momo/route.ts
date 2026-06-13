import { NextRequest } from "next/server";
import { z } from "zod";
import { momoService } from "@/lib/services/payment/momo.service";
import { walletService } from "@/lib/services/wallet.service";
import { apiResponse, withAuth } from "@/lib/api/handler";
import type { WalletType, UserRole } from "@prisma/client";

const ROLE_WALLET: Partial<Record<UserRole, WalletType>> = {
  TENANT: "TENANT",
  LENDER: "LENDER",
  LANDLORD: "LANDLORD",
};

const paymentSchema = z.object({
  amount: z.number().positive(),
  phone: z.string().min(10),
});

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const parsed = paymentSchema.safeParse(await req.json());
  if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

  const walletType = ROLE_WALLET[session.user.role];
  if (!walletType) return apiResponse({ error: "Invalid role" }, 400);

  const payment = await momoService.requestPayment({
    amount: parsed.data.amount,
    phone: parsed.data.phone,
    description: "RentVest wallet top-up",
  });

  if (payment.status === "SUCCESSFUL") {
    const result = await walletService.deposit(
      session.user.id,
      walletType,
      parsed.data.amount,
      `MoMo ${payment.reference}`
    );
    return apiResponse({ payment, wallet: result });
  }

  return apiResponse({ payment }, 202);
});
