import { NextRequest } from "next/server";
import { z } from "zod";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import {
  normalizeGhanaPhoneNumber,
  resolvePaystackAccount,
} from "@/lib/integrations/paystack/banks";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (req: NextRequest) => {
  const parsed = z
    .object({
      accountType: z.enum(["BANK", "MOMO"]),
      accountNumber: z.string().min(8),
      bankCode: z.string().min(2),
    })
    .safeParse({
      accountType: req.nextUrl.searchParams.get("accountType"),
      accountNumber: req.nextUrl.searchParams.get("accountNumber"),
      bankCode: req.nextUrl.searchParams.get("bankCode"),
    });

  if (!parsed.success) {
    return apiResponse({ error: "Account number and provider are required" }, 400);
  }

  if (!isPaystackConfigured()) {
    return apiResponse(
      { error: "Account verification is unavailable until Paystack is configured." },
      503
    );
  }

  const accountNumber =
    parsed.data.accountType === "MOMO"
      ? normalizeGhanaPhoneNumber(parsed.data.accountNumber)
      : parsed.data.accountNumber.trim();

  try {
    const resolved = await resolvePaystackAccount({
      accountNumber,
      bankCode: parsed.data.bankCode,
    });

    return apiResponse({
      accountNumber: resolved.accountNumber,
      accountName: resolved.accountName,
      verified: true,
    });
  } catch (error) {
    return apiResponse(
      {
        verified: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not verify this account. Check the number and provider.",
      },
      400
    );
  }
});
