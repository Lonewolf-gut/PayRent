import { NextRequest } from "next/server";
import { createPayoutBankSchema } from "@/lib/payout-banks/validation";
import { payoutBankConfigService } from "@/lib/services/payout-bank-config.service";
import { apiError, apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const banks = await payoutBankConfigService.listAll();
    return apiResponse(banks);
  },
  { roles: ["ADMIN"], permission: "admin:fees" }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = createPayoutBankSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    try {
      const bank = await payoutBankConfigService.create(parsed.data, session.user.id);
      return apiResponse(bank, 201, "Payout bank added.");
    } catch (error) {
      return apiError(error);
    }
  },
  { roles: ["ADMIN"], permission: "admin:fees" }
);
