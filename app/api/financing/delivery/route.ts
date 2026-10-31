import { NextRequest } from "next/server";
import { z } from "zod";
import { financingService } from "@/lib/services/financing.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

const deliverySchema = z.object({
  financingRequestId: z.string().cuid(),
});

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const pending = await financingService.getPendingMerchantDelivery(session.user.id);
    return apiResponse(pending);
  },
  { roles: ["MERCHANT"] }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = deliverySchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    const result = await financingService.confirmDelivery(
      session.user.id,
      parsed.data.financingRequestId
    );

    return apiResponse(result);
  },
  { roles: ["MERCHANT"] }
);
