import { NextRequest } from "next/server";
import { z } from "zod";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import {
  GHANA_MOMO_NETWORKS,
  listPaystackBanks,
} from "@/lib/integrations/paystack/banks";
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

  if (!isPaystackConfigured()) {
    return apiResponse({
      configured: false,
      providers:
        parsed.data.accountType === "MOMO"
          ? GHANA_MOMO_NETWORKS
          : [],
    });
  }

  if (parsed.data.accountType === "MOMO") {
    try {
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

  const providers = await listPaystackBanks({ type: "ghipss" });
  return apiResponse({
    configured: true,
    providers: providers.map((bank) => ({
      code: bank.code,
      name: bank.name,
    })),
  });
});
