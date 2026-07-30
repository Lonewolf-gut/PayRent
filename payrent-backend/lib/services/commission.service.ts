import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getBusinessRulesSync } from "@/lib/services/business-rules.service";

export class CommissionService {
  calculateFees(amount: number) {
    const rules = getBusinessRulesSync();
    const serviceFee = (amount * rules.serviceFeePercent) / 100;
    const commissionFee = (amount * rules.commissionFeePercent) / 100;
    const processingFee = (amount * rules.processingFeePercent) / 100;
    const totalFee = serviceFee + commissionFee + processingFee;

    return { serviceFee, commissionFee, processingFee, totalFee };
  }

  async recordCommission(
    transactionId: string,
    fees: ReturnType<CommissionService["calculateFees"]>
  ) {
    return prisma.commission.create({
      data: {
        transactionId,
        serviceFee: new Prisma.Decimal(fees.serviceFee),
        commissionFee: new Prisma.Decimal(fees.commissionFee),
        processingFee: new Prisma.Decimal(fees.processingFee),
        totalFee: new Prisma.Decimal(fees.totalFee),
      },
    });
  }
}

export const commissionService = new CommissionService();
