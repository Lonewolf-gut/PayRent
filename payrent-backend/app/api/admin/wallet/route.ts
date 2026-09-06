import { walletService } from "@/lib/services/wallet.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const balance = await walletService.getPlatformBalance();
    const history = await walletService.getPlatformHistory();
    return apiResponse({ ...balance, ...history });
  },
  { roles: ["ADMIN"], permission: "wallet:read" }
);
