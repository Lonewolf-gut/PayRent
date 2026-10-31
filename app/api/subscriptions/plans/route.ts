import { subscriptionService } from "@/lib/services/subscription.service";
import { apiResponse, withPublicHandler } from "@/lib/api/handler";
import type { SubscriptionPlan } from "@prisma/client";

export const GET = withPublicHandler(async () => {
  const plans = (["FREE", "PRO", "MAX"] as SubscriptionPlan[]).map((p) =>
    subscriptionService.getPlanFeatures(p)
  );
  return apiResponse(plans);
});
