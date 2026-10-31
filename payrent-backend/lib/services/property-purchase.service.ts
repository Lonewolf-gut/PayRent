import { prisma, runTransaction } from "@/lib/db/prisma";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import { agentCommissionService } from "@/lib/services/agent-commission.service";
import { calculateAgentCommission } from "@/lib/constants/agent-commission";
import { AppError } from "@/lib/errors";
import { isSaleListing } from "@/lib/subscription-limits";
import { v4 as uuidv4 } from "uuid";
import {
  deletePendingPayment,
  getCompletedPayment,
  getPendingPayment,
  markPaymentCompleted,
  type PropertyPurchasePendingSession,
} from "@/lib/services/payment/pending-payment.store";
import { reddePaymentService } from "@/lib/services/payment/redde-payment.service";

export class PropertyPurchaseService {
  async validatePurchase(tenantUserId: string, propertyId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { userId: tenantUserId } });
    if (!tenant) throw new AppError("Customer profile required", 403);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { landlord: { select: { userId: true } } },
    });

    if (!property || property.status !== "ACTIVE") {
      throw new AppError("Property is not available for purchase", 400);
    }

    if (!isSaleListing(property.propertyType)) {
      throw new AppError("This listing is not available for direct purchase", 400);
    }

    const price = Number(property.discountedPrice ?? property.monthlyRent);
    if (price <= 0) throw new AppError("Invalid listing price", 400);

    return {
      price,
      propertyName: property.name,
      landlordUserId: property.landlord.userId,
    };
  }

  async initiateReddePurchase(
    tenantUserId: string,
    propertyId: string,
    bankAccountId: string,
    referredAgentProfileId?: string | null
  ) {
    await this.validatePurchase(tenantUserId, propertyId);
    return reddePaymentService.requestPropertyPurchasePayment({
      userId: tenantUserId,
      propertyId,
      bankAccountId,
      referredAgentProfileId,
    });
  }

  async completeReddePurchase(params: {
    clientReference: string;
    amount: number;
  }) {
    const completed = await getCompletedPayment<{ reference: string }>(params.clientReference);
    if (completed) {
      return { alreadyProcessed: true as const, reference: completed.reference };
    }

    const session = await getPendingPayment(params.clientReference);
    if (!session || session.purpose !== "PROPERTY_PURCHASE") {
      throw new AppError("Property purchase payment session not found", 404);
    }

    const purchaseSession = session as PropertyPurchasePendingSession;
    if (Math.abs(purchaseSession.amount - params.amount) > 0.01) {
      // still fulfill using session amount — Redde is source of truth for callback
    }

    const result = await this.fulfillPurchase(
      purchaseSession.userId,
      purchaseSession.propertyId,
      purchaseSession.referredAgentProfileId,
      params.clientReference
    );

    await markPaymentCompleted(params.clientReference, { reference: result.reference });
    await deletePendingPayment(params.clientReference);

    return { alreadyProcessed: false as const, ...result };
  }

  /** @deprecated Wallet purchases — use Redde via initiateReddePurchase */
  async purchase(
    tenantUserId: string,
    propertyId: string,
    referredAgentProfileId?: string | null
  ) {
    const preview = await this.validatePurchase(tenantUserId, propertyId);
    const tenantWallet = await walletService.getOrCreateWallet(tenantUserId, "BUYER");
    if (Number(tenantWallet.balance) < preview.price) {
      throw new AppError(
        "Pay with Redde (MoMo or bank) from the listing page. Wallet-only checkout is disabled.",
        400,
        "INSUFFICIENT_FUNDS"
      );
    }

    return this.fulfillPurchase(
      tenantUserId,
      propertyId,
      referredAgentProfileId,
      `BUY-${uuidv4().slice(0, 8).toUpperCase()}`
    );
  }

  private async fulfillPurchase(
    tenantUserId: string,
    propertyId: string,
    referredAgentProfileId: string | null | undefined,
    reference: string
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { userId: tenantUserId } });
    if (!tenant) throw new AppError("Customer profile required", 403);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        landlord: { include: { user: true } },
        assignedAgent: { include: { user: true } },
      },
    });

    if (!property || property.status !== "ACTIVE") {
      throw new AppError("Property is no longer available", 400);
    }

    const price = Number(property.discountedPrice ?? property.monthlyRent);

    const commissionAgent = await agentCommissionService.resolveCommissionAgent(
      propertyId,
      referredAgentProfileId
    );

    const agentCommission =
      commissionAgent ? calculateAgentCommission(price) : 0;

    const result = await runTransaction(async (db) => {
      if (commissionAgent && agentCommission > 0) {
        const agentWallet = await walletService.getOrCreateWallet(
          commissionAgent.user.id,
          "MARKETER"
        );
        await agentCommissionService.recordCommission(
          db,
          commissionAgent.id,
          agentWallet.id,
          commissionAgent.user.id,
          {
            agentProfileId: commissionAgent.id,
            propertyId,
            propertyName: property.name,
            grossAmount: price,
            type: "SALE",
            reference,
          },
          agentCommission
        );
      }

      await db.property.update({
        where: { id: propertyId },
        data: { status: "INACTIVE" },
      });

      return { price, agentCommission, reference };
    });

    await notificationService.create({
      userId: property.landlord.userId,
      title: "Property sold",
      body: `"${property.name}" was purchased for GHS ${price.toLocaleString()} (invoice ${reference}).`,
      metadata: { propertyId, reference: result.reference },
    });

    if (commissionAgent && agentCommission > 0) {
      await notificationService.create({
        userId: commissionAgent.user.id,
        title: "Sale commission earned",
        body: `You earned GHS ${agentCommission.toLocaleString()} commission on "${property.name}".`,
        metadata: { propertyId, commission: agentCommission },
      });
    } else if (commissionAgent) {
      await notificationService.create({
        userId: commissionAgent.user.id,
        title: "Promoted listing sold",
        body: `"${property.name}" was sold through your promotion.`,
        metadata: { propertyId },
      });
    }

    await notificationService.create({
      userId: tenantUserId,
      title: "Purchase complete",
      body: `You successfully purchased "${property.name}" for GHS ${price.toLocaleString()}.`,
      metadata: { propertyId, reference: result.reference },
    });

    return result;
  }
}

export const propertyPurchaseService = new PropertyPurchaseService();
