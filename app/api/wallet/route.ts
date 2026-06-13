import { NextRequest } from "next/server";
import { walletService } from "@/lib/services/wallet.service";
import type { WalletType } from "@prisma/client";
import { apiResponse, withAuth } from "@/lib/api/handler";

const ROLE_WALLET: Record<string, WalletType> = {
  TENANT: "TENANT",
  LANDLORD: "LANDLORD",
  LENDER: "LENDER",
};

export const GET = withAuth(async (_req, _ctx, session) => {
  const walletType = ROLE_WALLET[session.user.role];
  if (!walletType) return apiResponse({ error: "Invalid role" }, 400);

  const balance = await walletService.getBalance(session.user.id, walletType);
  const history = await walletService.getHistory(session.user.id, walletType);
  return apiResponse({ ...balance, ...history });
});

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const { action, amount, description } = body;
  const walletType = ROLE_WALLET[session.user.role];
  if (!walletType) return apiResponse({ error: "Invalid role" }, 400);

  if (action === "deposit") {
    const result = await walletService.deposit(
      session.user.id,
      walletType,
      amount,
      description
    );
    return apiResponse(result);
  }

  return apiResponse({ error: "Invalid action" }, 400);
});
