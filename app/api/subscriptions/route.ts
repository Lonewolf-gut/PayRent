import { NextRequest } from "next/server";
import { z } from "zod";
import { subscriptionService } from "@/lib/services/subscription.service";
import { apiResponse, withAuth } from "@/lib/api/handler";
import type { SubscriptionPlan, BillingCycle } from "@prisma/client";

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const sub = await subscriptionService.getCurrent(session.user.id);
    return apiResponse(sub);
  }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const schema = z.object({
      action: z.enum(["upgrade", "cancel"]),
      plan: z.enum(["FREE", "STANDARD", "PREMIUM"]).optional(),
      billingCycle: z.enum(["MONTHLY", "ANNUAL"]).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

    if (parsed.data.action === "cancel") {
      const result = await subscriptionService.cancel(session.user.id);
      return apiResponse(result);
    }

    const result = await subscriptionService.upgrade(
      session.user.id,
      (parsed.data.plan ?? "STANDARD") as SubscriptionPlan,
      (parsed.data.billingCycle ?? "MONTHLY") as BillingCycle
    );
    return apiResponse(result);
  }
);
