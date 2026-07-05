import { NextRequest } from "next/server";
import { z } from "zod";
import { subscriptionService } from "@/lib/services/subscription.service";
import { getSubscriptionAccess } from "@/lib/subscription/access";
import { roleRequiresSubscription } from "@/lib/subscription/roles";
import { AppError } from "@/lib/errors";
import { getPaymentProvider } from "@/lib/services/payment/provider";
import { apiResponse, withAuth } from "@/lib/api/handler";
import type { SubscriptionPlan, BillingCycle } from "@prisma/client";

export const GET = withAuth(async (_req, _ctx, session) => {
  const [sub, access] = await Promise.all([
    subscriptionService.getCurrent(session.user.id),
    getSubscriptionAccess(session.user.id),
  ]);
  const features = subscriptionService.getPlanFeatures(sub?.plan ?? "FREE");
  return apiResponse({ subscription: sub, access, ...features });
});

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const schema = z.object({
    action: z.enum(["upgrade", "cancel"]),
    plan: z.enum(["PRO", "MAX", "PREMIUM"]).optional(),
    billingCycle: z.enum(["MONTHLY", "ANNUAL"]).optional(),
    paymentMethod: z.enum(["wallet", "paystack"]).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

  if (parsed.data.action === "cancel") {
    if (!roleRequiresSubscription(session.user.role)) {
      throw new AppError("Your account does not use subscriptions.", 403, "SUBSCRIPTION_NOT_AVAILABLE");
    }
    const result = await subscriptionService.cancel(session.user.id);
    return apiResponse(result);
  }

  if (!roleRequiresSubscription(session.user.role)) {
    throw new AppError(
      "Subscriptions are available for landlord and agent accounts only.",
      403,
      "SUBSCRIPTION_NOT_AVAILABLE"
    );
  }

  const plan = (parsed.data.plan ?? "PRO") as SubscriptionPlan;
  const billingCycle = (parsed.data.billingCycle ?? "MONTHLY") as BillingCycle;
  const provider = getPaymentProvider();
  const paymentMethod =
    parsed.data.paymentMethod ?? (provider === "paystack" ? "paystack" : "wallet");

  if (paymentMethod === "paystack" && provider === "paystack") {
    const checkout = await subscriptionService.upgradeWithPaystack(
      session.user.id,
      session.user.role,
      plan,
      billingCycle
    );

    if (!checkout.checkoutUrl) {
      return apiResponse({ checkout, message: checkout.message }, 202);
    }

    return apiResponse({
      checkout,
      message: checkout.message ?? "Redirecting to Paystack checkout…",
    });
  }

  const result = await subscriptionService.upgradeWithPayment(
    session.user.id,
    session.user.role,
    plan,
    billingCycle
  );
  return apiResponse(result);
});
