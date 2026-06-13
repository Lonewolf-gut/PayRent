import { prisma } from "@/lib/db/prisma";
import { SubscriptionPlan, BillingCycle } from "@prisma/client";
import { AppError } from "@/lib/errors";

const PLAN_PRICES: Record<
  SubscriptionPlan,
  { monthly: number; annual: number }
> = {
  FREE: { monthly: 0, annual: 0 },
  STANDARD: { monthly: 29.99, annual: 299.99 },
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
    const current = await this.getCurrent(userId);
    const price = PLAN_PRICES[plan][billingCycle === "MONTHLY" ? "monthly" : "annual"];

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

    return prisma.subscription.update({
      where: { id: current.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), autoRenew: false },
    });
  }

  getPlanFeatures(plan: SubscriptionPlan) {
    const features: Record<SubscriptionPlan, string[]> = {
      FREE: [
        "Access to up to 20 properties total",
        "Up to 10 houses/apartments",
        "Up to 5 cars",
        "Up to 5 home appliances"
      ],
      STANDARD: [
        "Access to properties",
        "Financing review",
        "Email support"
      ],
      PREMIUM: [
        "Unlimited access to all property types",
        "Priority financing review",
        "Premium listings placement",
        "Advanced support"
      ],
    };
    return { plan, features: features[plan], pricing: PLAN_PRICES[plan] };
  }
}

export const subscriptionService = new SubscriptionService();
