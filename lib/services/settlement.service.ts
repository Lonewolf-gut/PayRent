import { Prisma } from "@prisma/client";
import { prisma, runTransaction } from "@/lib/db/prisma";
import { auditService } from "@/lib/services/audit.service";
import { AppError } from "@/lib/errors";

export class SettlementService {
  async createFromFinancing(financingRequestId: string, adminUserId?: string) {
    const financing = await prisma.financingRequest.findUnique({
      where: { id: financingRequestId },
      include: {
        property: { include: { landlord: true } },
        investment: { include: { lender: true } },
      },
    });

    if (!financing?.investment) {
      throw new AppError("Financed request not found", 404);
    }

    const grossAmount = Number(financing.approvedAmount ?? financing.requestedAmount);
    const platformFee = grossAmount * 0.025;
    const netLandlord = grossAmount - platformFee;

    const settlements = await runTransaction(async (db) => {
      const landlordSettlement = await db.settlementRecord.create({
        data: {
          financingRequestId,
          beneficiaryUserId: financing.property.landlord.userId,
          beneficiaryType: "LANDLORD",
          grossAmount: new Prisma.Decimal(grossAmount),
          feeAmount: new Prisma.Decimal(platformFee),
          netAmount: new Prisma.Decimal(netLandlord),
          status: "PENDING",
          settlementReference: `set_${Date.now()}_landlord`,
        },
      });

      const platformSettlement = await db.settlementRecord.create({
        data: {
          financingRequestId,
          beneficiaryType: "PLATFORM",
          grossAmount: new Prisma.Decimal(platformFee),
          feeAmount: new Prisma.Decimal(0),
          netAmount: new Prisma.Decimal(platformFee),
          status: "PENDING",
          settlementReference: `set_${Date.now()}_platform`,
        },
      });

      return [landlordSettlement, platformSettlement];
    });

    if (adminUserId) {
      await auditService.log({
        userId: adminUserId,
        action: "SETTLEMENTS_CREATED",
        entity: "FinancingRequest",
        entityId: financingRequestId,
      });
    }

    return settlements;
  }

  async listForUser(userId: string, role: string) {
    if (role === "LANDLORD") {
      return prisma.settlementRecord.findMany({
        where: { beneficiaryUserId: userId },
        include: {
          financingRequest: { include: { property: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return this.listForAdmin();
  }

  async listForAdmin(filter?: { status?: "PENDING" | "COMPLETED" | "PROCESSING" | "FAILED" }) {
    return prisma.settlementRecord.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      include: {
        financingRequest: {
          include: {
            property: { select: { id: true, name: true } },
            tenant: { include: { user: { select: { email: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markCompleted(settlementId: string, adminUserId: string) {
    const settlement = await prisma.settlementRecord.update({
      where: { id: settlementId },
      data: {
        status: "COMPLETED",
        settledAt: new Date(),
      },
    });

    await auditService.log({
      userId: adminUserId,
      action: "SETTLEMENT_COMPLETED",
      entity: "SettlementRecord",
      entityId: settlementId,
    });

    return settlement;
  }

  async listReconciliationExceptions() {
    return prisma.reconciliationException.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async resolveException(
    exceptionId: string,
    adminUserId: string,
    resolutionNote: string
  ) {
    return prisma.reconciliationException.update({
      where: { id: exceptionId },
      data: {
        status: "RESOLVED",
        assignedTo: adminUserId,
        resolvedAt: new Date(),
        resolutionNote,
      },
    });
  }
}

export const settlementService = new SettlementService();
