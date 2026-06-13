import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export class CommissionService {
  calculateFees(amount: number) {
    const serviceFeePercent = parseFloat(process.env.SERVICE_FEE_PERCENT ?? "1.5");
    const commissionFeePercent = parseFloat(
      process.env.COMMISSION_FEE_PERCENT ?? "2.0"
    );
    const processingFeePercent = parseFloat(
      process.env.PROCESSING_FEE_PERCENT ?? "0.5"
    );

    const serviceFee = (amount * serviceFeePercent) / 100;
    const commissionFee = (amount * commissionFeePercent) / 100;
    const processingFee = (amount * processingFeePercent) / 100;
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
