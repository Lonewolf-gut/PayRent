import { prisma } from "@/lib/db/prisma";
import { SubscriptionPlan, BillingCycle } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { FREE_PLAN_LIMITS } from "@/lib/subscription-limits";

const PLAN_PRICES: Record<
  SubscriptionPlan,
  { monthly: number; annual: number }
> = {
  FREE: { monthly: 0, annual: 0 },
  PREMIUM: { monthly: 79.99, annual: 799.99 },
};

export class SubscriptionService {
  async getCurrent(userId: string) {
    return prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  async upgrade(
    userId: string,
    plan: SubscriptionPlan,
    billingCycle: BillingCycle
  ) {
    if (plan === "FREE") {
      throw new AppError("Use cancel to return to the free plan");
    }

    const current = await this.getCurrent(userId);

    if (current) {
      await prisma.subscription.update({
        where: { id: current.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
    }

    const endDate = new Date();
    if (billingCycle === "MONTHLY") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return prisma.subscription.create({
      data: {
        userId,
        plan,
        billingCycle,
        status: "ACTIVE",
        autoRenew: true,
        endDate,
      },
    });
  }

  async cancel(userId: string) {
    const current = await this.getCurrent(userId);
    if (!current) throw new AppError("No active subscription");

    await prisma.subscription.update({
      where: { id: current.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), autoRenew: false },
    });

    return prisma.subscription.create({
      data: { userId, plan: "FREE", status: "ACTIVE" },
    });
  }

  getPlanFeatures(plan: SubscriptionPlan) {
    const features: Record<SubscriptionPlan, string[]> = {
      FREE: [
        "Up to 10 properties, 5 cars, and 5 appliances",
        "20 total asset limit across all types",
        "Basic marketplace access",
        "Email support",
      ],
      PREMIUM: [
        "Unlimited access to all property types",
        "Priority financing review",
        "Premium listings placement",
        "Advanced support",
      ],
    };
    return { plan, features: features[plan], pricing: PLAN_PRICES[plan] };
  }

  getFreeLimits() {
    return FREE_PLAN_LIMITS;
  }
}

export const subscriptionService = new SubscriptionService();
