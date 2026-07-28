import { NextRequest } from "next/server";
import { walletService } from "@/lib/services/wallet.service";
import { apiResponse, withAuth } from "@/lib/api/handler";
import {
  canDeposit,
  getWalletTypeForRole,
} from "@/lib/wallet/role-wallet";

export const GET = withAuth(async (_req, _ctx, session) => {
  const walletType = getWalletTypeForRole(session.user.role);
  if (!walletType) return apiResponse({ error: "Invalid role" }, 400);

  const balance = await walletService.getBalance(session.user.id, walletType);
  const history = await walletService.getHistory(session.user.id, walletType);
  return apiResponse({ ...balance, ...history });
});

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  if (!canDeposit(session.user.role)) {
    return apiResponse({ error: "Deposits are not available for this role" }, 403);
  }

  const body = await req.json();
  const { action, amount, description } = body;
  const walletType = getWalletTypeForRole(session.user.role);
  if (!walletType) return apiResponse({ error: "Invalid role" }, 400);

  if (action === "deposit") {
    return apiResponse(
      {
        error:
          "Use a saved bank or MoMo account via POST /api/payments/deposit instead of manual wallet credits.",
      },
      400
    );
  }

  return apiResponse({ error: "Invalid action" }, 400);
});
