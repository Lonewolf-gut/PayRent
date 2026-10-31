import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiResponse, withAuth } from "@/lib/api/handler";
import { settlementAccountService } from "@/lib/services/payment/settlement-account.service";

const schema = z.object({
  bankName: z.string().min(2),
  bankCode: z.string().min(2),
  accountNumber: z.string().min(5),
  accountName: z.string().min(2),
  partnerBankId: z.string().optional(),
});

export const GET = withAuth(
  async () => {
    const accounts = await settlementAccountService.listAccounts();
    return apiResponse({ accounts });
  },
  { roles: ["ADMIN"], permission: "admin:fees" }
);

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const parsed = schema.safeParse(await req.json());
      if (!parsed.success) {
        return apiResponse({ error: "Invalid settlement account payload" }, 400);
      }

      const account = await settlementAccountService.upsertDefaultAccount(parsed.data);
      return apiResponse(account, 201);
    } catch (error) {
      return apiError(error);
    }
  },
  { roles: ["ADMIN"], permission: "admin:fees" }
);
