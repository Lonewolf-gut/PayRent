import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import { listPaystackBanks } from "@/lib/integrations/paystack/banks";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    if (!isPaystackConfigured()) {
      return apiResponse({
        configured: false,
        banks: [],
      });
    }

    try {
      const banks = await listPaystackBanks({ type: "ghipss", country: "ghana" });
      return apiResponse({
        configured: true,
        banks: banks.map((bank) => ({
          id: bank.id,
          slug: bank.slug,
          code: bank.code,
          name: bank.name,
          longcode: bank.longcode ?? null,
        })),
      });
    } catch (error) {
      return apiResponse(
        {
          configured: true,
          banks: [],
          error: error instanceof Error ? error.message : "Could not load Paystack banks.",
        },
        200
      );
    }
  },
  { roles: ["ADMIN"], permission: "admin:fees" }
);
