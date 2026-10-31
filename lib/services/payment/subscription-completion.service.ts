import { subscriptionService } from "@/lib/services/subscription.service";
import { PLAN_CATALOG, normalizeSubscriptionPlan } from "@/lib/subscription/plans";
import { notificationService } from "@/lib/services/notification.service";
import { logger } from "@/lib/logger";
import {
  deletePendingPayment,
  getCompletedPayment,
  getPendingPayment,
  markPaymentCompleted,
  type SubscriptionPendingSession,
} from "@/lib/services/payment/pending-payment.store";

export async function completeSubscriptionPayment(params: {
  clientReference: string;
  amount: number;
  provider: string;
  metadata?: Record<string, unknown>;
}) {
  const completed = await getCompletedPayment<{ subscriptionId: string }>(
    params.clientReference
  );
  if (completed) {
    return { alreadyProcessed: true as const, subscriptionId: completed.subscriptionId };
  }

  const session = await getPendingPayment(params.clientReference);

  if (!session || session.purpose !== "SUBSCRIPTION") {
    logger.error("Subscription payment completion missing session", {
      clientReference: params.clientReference,
    });
    throw new Error("Subscription payment session not found");
  }

  const subSession = session as SubscriptionPendingSession;

  if (Math.abs(subSession.amount - params.amount) > 0.01) {
    logger.warn("Subscription payment amount mismatch", {
      clientReference: params.clientReference,
      expected: subSession.amount,
      received: params.amount,
    });
  }

  const subscription = await subscriptionService.upgrade(
    subSession.userId,
    subSession.plan,
    subSession.billingCycle,
    { skipCancelCheck: true }
  );

  await markPaymentCompleted(params.clientReference, {
    subscriptionId: subscription.id,
  });
  await deletePendingPayment(params.clientReference);

  const cycleLabel = subSession.billingCycle === "ANNUAL" ? "annual" : "monthly";
  const planLabel = PLAN_CATALOG[normalizeSubscriptionPlan(subSession.plan)].name;
  await notificationService.create({
    userId: subSession.userId,
    title: `${planLabel} activated`,
    body: `Your ${planLabel} plan (${cycleLabel}) is active until ${subscription.endDate?.toLocaleDateString() ?? "the renewal date"}.`,
    channel: "EMAIL",
    sendEmail: true,
  });

  return { alreadyProcessed: false as const, subscription };
}
