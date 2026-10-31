import { NextRequest } from "next/server";
import { z } from "zod";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { propertyPurchaseService } from "@/lib/services/property-purchase.service";
import { AppError } from "@/lib/errors";
import { getReferralAgentProfileId } from "@/lib/utils/agent-referral-request";

const bodySchema = z.object({
  bankAccountId: z.string().cuid(),
});

export const POST = withAuth(
  async (req: NextRequest, context, session) => {
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse(
        { error: "A verified MoMo or bank account is required to pay with Redde." },
        400
      );
    }

    const referredAgentProfileId = await getReferralAgentProfileId(req);

    try {
      const checkout = await propertyPurchaseService.initiateReddePurchase(
        session.user.id,
        id,
        parsed.data.bankAccountId,
        referredAgentProfileId
      );

      return apiResponse(
        { checkout },
        checkout.status === "FAILED" ? 400 : 202,
        checkout.message ??
          "Complete the Redde payment to finish your purchase."
      );
    } catch (error) {
      if (error instanceof AppError) {
        return apiResponse({ error: error.message, code: error.code }, error.statusCode);
      }
      throw error;
    }
  },
  { roles: ["BUYER"] }
);
