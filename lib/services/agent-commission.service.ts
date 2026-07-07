import { Prisma, type AgentEarningType, type PrismaClient } from "@prisma/client";
import { prisma, runTransaction } from "@/lib/db/prisma";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import { assertEligibleAgent } from "@/lib/services/agent-assignment.service";
import {
  AGENT_COMMISSION_RATE,
  calculateAgentCommission,
} from "@/lib/constants/agent-commission";

type PayCommissionInput = {
  agentProfileId: string;
  propertyId: string;
  propertyName: string;
  grossAmount: number;
  type: AgentEarningType;
  reference: string;
  applicationId?: string;
  financingRequestId?: string;
};

export class AgentCommissionService {
  async resolveCommissionAgent(
    propertyId: string,
    referredAgentProfileId?: string | null
  ) {
    if (referredAgentProfileId) {
      try {
        return await assertEligibleAgent(referredAgentProfileId);
      } catch {
        return null;
      }
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        assignedAgent: {
          include: { user: { select: { id: true, isActive: true, role: true } } },
        },
      },
    });

    if (
      !property?.assignedAgent ||
      !property.assignedAgent.user.isActive ||
      property.assignedAgent.user.role !== "AGENT"
    ) {
      return null;
    }

    try {
      return await assertEligibleAgent(property.assignedAgent.id);
    } catch {
      return null;
    }
  }

  async payCommission(input: PayCommissionInput) {
    const agent = await assertEligibleAgent(input.agentProfileId);
    const commission = calculateAgentCommission(input.grossAmount);
    if (commission <= 0) {
      return { commission: 0, agentProfileId: agent.id };
    }

    const agentWallet = await walletService.getOrCreateWallet(agent.user.id, "AGENT");

    const result = await runTransaction(async (db) =>
      this.recordCommission(db, agent.id, agentWallet.id, agent.user.id, input, commission)
    );

    await notificationService.create({
      userId: agent.user.id,
      title:
        input.type === "SALE" ? "Sale commission earned" : "Financing commission earned",
      body: `You earned GHS ${result.commission.toLocaleString()} commission on "${input.propertyName}".`,
      metadata: {
        propertyId: input.propertyId,
        commission: result.commission,
        type: input.type,
      },
    });

    return { commission: result.commission, agentProfileId: agent.id };
  }

  async recordCommission(
    db: PrismaClient | Prisma.TransactionClient,
    agentProfileId: string,
    agentWalletId: string,
    agentUserId: string,
    input: PayCommissionInput,
    commission?: number
  ) {
    const amount = commission ?? calculateAgentCommission(input.grossAmount);
    if (amount <= 0) {
      return { commission: 0, transactionId: null as string | null };
    }

    await db.wallet.update({
      where: { id: agentWalletId },
      data: { balance: { increment: amount } },
    });

    const transaction = await db.walletTransaction.create({
      data: {
        walletId: agentWalletId,
        type: "COMMISSION",
        status: "COMPLETED",
        amount: new Prisma.Decimal(amount),
        fee: 0,
        commission: 0,
        netAmount: new Prisma.Decimal(amount),
        reference: `${input.reference}-AG`,
        description:
          input.type === "SALE"
            ? `Sale commission: ${input.propertyName}`
            : `Financing commission: ${input.propertyName}`,
        metadata: {
          propertyId: input.propertyId,
          type: input.type,
          grossAmount: input.grossAmount,
          commissionRate: AGENT_COMMISSION_RATE,
        },
      },
    });

    await db.agentEarning.create({
      data: {
        agentProfileId,
        propertyId: input.propertyId,
        type: input.type,
        amount: new Prisma.Decimal(amount),
        grossAmount: new Prisma.Decimal(input.grossAmount),
        commissionRate: new Prisma.Decimal(AGENT_COMMISSION_RATE * 100),
        reference: input.reference,
        applicationId: input.applicationId,
        financingRequestId: input.financingRequestId,
        walletTransactionId: transaction.id,
      },
    });

    return { commission: amount, transactionId: transaction.id, agentUserId };
  }

  async listEarnings(agentProfileId: string) {
    const [earnings, totals] = await Promise.all([
      prisma.agentEarning.findMany({
        where: { agentProfileId },
        include: {
          property: { select: { id: true, name: true, propertyType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.agentEarning.aggregate({
        where: { agentProfileId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      earnings,
      totalEarned: Number(totals._sum.amount ?? 0),
      totalDeals: totals._count,
    };
  }
}

export const agentCommissionService = new AgentCommissionService();
