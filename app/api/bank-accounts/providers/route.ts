import { NextRequest } from "next/server";
import { z } from "zod";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import {
  getAllowedPayoutBankProviders,
  ALLOWED_PAYOUT_BANK_FALLBACKS,
} from "@/lib/constants/allowed-payout-banks";
import { GHANA_MOMO_NETWORKS } from "@/lib/integrations/paystack/banks";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (req: NextRequest) => {
  const parsed = z
    .object({
      accountType: z.enum(["BANK", "MOMO"]).default("BANK"),
    })
    .safeParse({
      accountType: req.nextUrl.searchParams.get("accountType") ?? "BANK",
    });

  if (!parsed.success) {
    return apiResponse({ error: "Invalid account type" }, 400);
  }

  if (parsed.data.accountType === "MOMO") {
    if (!isPaystackConfigured()) {
      return apiResponse({
        configured: false,
        providers: GHANA_MOMO_NETWORKS,
      });
    }

    try {
      const { listPaystackBanks } = await import("@/lib/integrations/paystack/banks");
      const providers = await listPaystackBanks({ type: "mobile_money" });
      if (providers.length) {
        return apiResponse({
          configured: true,
          providers: providers.map((bank) => ({
            code: bank.code,
            name: bank.name,
          })),
        });
      }
    } catch {
      // Fall back to static list when Paystack mobile list is unavailable.
    }

    return apiResponse({
      configured: true,
      providers: GHANA_MOMO_NETWORKS,
    });
  }

  const allowedBanks = isPaystackConfigured()
    ? await getAllowedPayoutBankProviders()
    : ALLOWED_PAYOUT_BANK_FALLBACKS;

  return apiResponse({
    configured: isPaystackConfigured(),
    providers: allowedBanks,
  });
});
