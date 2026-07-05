import { Prisma } from "@prisma/client";
import { prisma, runTransaction } from "@/lib/db/prisma";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import { AppError } from "@/lib/errors";
import { isSaleListing } from "@/lib/subscription-limits";
import { v4 as uuidv4 } from "uuid";

const AGENT_COMMISSION_RATE = Number(process.env.AGENT_COMMISSION_PERCENT ?? "2.5") / 100;

export class PropertyPurchaseService {
  async purchase(tenantUserId: string, propertyId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { userId: tenantUserId } });
    if (!tenant) throw new AppError("Tenant profile required", 403);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        landlord: { include: { user: true } },
        assignedAgent: { include: { user: true } },
      },
    });

    if (!property || property.status !== "ACTIVE") {
      throw new AppError("Property is not available for purchase", 400);
    }

    if (!isSaleListing(property.propertyType)) {
      throw new AppError("This listing is not available for direct purchase", 400);
    }

    const price = Number(property.discountedPrice ?? property.monthlyRent);
    if (price <= 0) throw new AppError("Invalid listing price", 400);

    const tenantWallet = await walletService.getOrCreateWallet(tenantUserId, "TENANT");
    if (Number(tenantWallet.balance) < price) {
      throw new AppError(
        "Insufficient wallet balance. Deposit funds to complete this purchase.",
        400,
        "INSUFFICIENT_FUNDS"
      );
    }

    const landlordWallet = await walletService.getOrCreateWallet(
      property.landlord.userId,
      "LANDLORD"
    );
    const agentWallet =
      property.assignedAgent && property.agentUserId
        ? await walletService.getOrCreateWallet(property.assignedAgent.userId, "AGENT")
        : null;

    const agentCommission =
      agentWallet && property.agentUserId
        ? Math.round(price * AGENT_COMMISSION_RATE * 100) / 100
        : 0;
    const landlordNet = price - agentCommission;
    const reference = `BUY-${uuidv4().slice(0, 8).toUpperCase()}`;

    const result = await runTransaction(async (db) => {
      await db.wallet.update({
        where: { id: tenantWallet.id },
        data: { balance: { decrement: price } },
      });

      await db.wallet.update({
        where: { id: landlordWallet.id },
        data: { balance: { increment: landlordNet } },
      });

      await db.walletTransaction.create({
        data: {
          walletId: tenantWallet.id,
          type: "PAYMENT",
          status: "COMPLETED",
          amount: new Prisma.Decimal(price),
          fee: 0,
          commission: 0,
          netAmount: new Prisma.Decimal(price),
          reference,
          description: `Purchase: ${property.name}`,
        },
      });

      await db.walletTransaction.create({
        data: {
          walletId: landlordWallet.id,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: new Prisma.Decimal(landlordNet),
          fee: 0,
          commission: 0,
          netAmount: new Prisma.Decimal(landlordNet),
          reference: `${reference}-LL`,
          description: `Sale proceeds: ${property.name}`,
        },
      });

      if (agentWallet && agentCommission > 0) {
        await db.wallet.update({
          where: { id: agentWallet.id },
          data: { balance: { increment: agentCommission } },
        });

        await db.walletTransaction.create({
          data: {
            walletId: agentWallet.id,
            type: "COMMISSION",
            status: "COMPLETED",
            amount: new Prisma.Decimal(agentCommission),
            fee: 0,
            commission: 0,
            netAmount: new Prisma.Decimal(agentCommission),
            reference: `${reference}-AG`,
            description: `Commission: ${property.name}`,
          },
        });
      }

      await db.property.update({
        where: { id: propertyId },
        data: { status: "INACTIVE" },
      });

      return { price, agentCommission, landlordNet, reference };
    });

    await notificationService.create({
      userId: property.landlord.userId,
      title: "Property sold",
      body: `"${property.name}" was purchased for GHS ${price.toLocaleString()}.`,
      metadata: { propertyId, reference: result.reference },
    });

    if (property.assignedAgent) {
      await notificationService.create({
        userId: property.assignedAgent.userId,
        title: "Sale commission earned",
        body:
          agentCommission > 0
            ? `You earned GHS ${agentCommission.toLocaleString()} commission on "${property.name}".`
            : `"${property.name}" was sold. Thank you for promoting this listing.`,
        metadata: { propertyId, commission: agentCommission },
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
