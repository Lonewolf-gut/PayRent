import { NextRequest } from "next/server";
import { z } from "zod";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import {
  getAllowedPayoutBankProviders,
  ALLOWED_PAYOUT_BANK_FALLBACKS,
} from "@/lib/constants/allowed-payout-banks";
import { GHANA_MOMO_NETWORKS } from "@/lib/integrations/paystack/banks";
import { apiError, apiResponse, withAuth } from "@/lib/api/handler";

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

  const paystackReady = isPaystackConfigured();

  if (parsed.data.accountType === "MOMO") {
    return apiResponse({
      configured: paystackReady,
      providers: [...GHANA_MOMO_NETWORKS],
    });
  }

  if (!paystackReady) {
    return apiResponse({
      configured: false,
      providers: ALLOWED_PAYOUT_BANK_FALLBACKS,
    });
  }

  try {
    const allowedBanks = await getAllowedPayoutBankProviders();
    return apiResponse({
      configured: true,
      providers: allowedBanks,
    });
  } catch (error) {
    return apiError(error);
  }
});
