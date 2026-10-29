import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

type RecordMismatchInput = {
  relatedRecordType: string;
  relatedRecordId: string;
  exceptionType: string;
  expectedAmount?: number;
  actualAmount?: number;
  providerReference?: string;
};

export class ReconciliationService {
  async recordMismatch(input: RecordMismatchInput) {
    const open = await prisma.reconciliationException.findFirst({
      where: {
        relatedRecordType: input.relatedRecordType,
        relatedRecordId: input.relatedRecordId,
        exceptionType: input.exceptionType,
        status: { in: ["UNDER_REVIEW", "UNMATCHED_PAYMENT", "SETTLEMENT_MISMATCH", "MISSING_CONFIRMATION"] },
      },
    });

    const data = {
      expectedAmount:
        input.expectedAmount != null
          ? new Prisma.Decimal(input.expectedAmount)
          : undefined,
      actualAmount:
        input.actualAmount != null
          ? new Prisma.Decimal(input.actualAmount)
          : undefined,
      providerReference: input.providerReference,
      status: "UNDER_REVIEW" as const,
    };

    if (open) {
      return prisma.reconciliationException.update({
        where: { id: open.id },
        data,
      });
    }

    const created = await prisma.reconciliationException.create({
      data: {
        relatedRecordType: input.relatedRecordType,
        relatedRecordId: input.relatedRecordId,
        exceptionType: input.exceptionType,
        ...data,
      },
    });

    logger.warn("Reconciliation exception recorded", {
      id: created.id,
      type: input.exceptionType,
      relatedRecordType: input.relatedRecordType,
      relatedRecordId: input.relatedRecordId,
    });

    return created;
  }

  async recordPaymentAmountMismatch(params: {
    clientReference: string;
    expectedAmount: number;
    actualAmount: number;
    providerReference?: string;
  }) {
    if (Math.abs(params.expectedAmount - params.actualAmount) <= 0.01) {
      return null;
    }

    return this.recordMismatch({
      relatedRecordType: "WalletDeposit",
      relatedRecordId: params.clientReference,
      exceptionType: "PAYMENT_AMOUNT_MISMATCH",
      expectedAmount: params.expectedAmount,
      actualAmount: params.actualAmount,
      providerReference: params.providerReference,
    });
  }

  async recordDeductionFailure(params: {
    deductionEventId: string;
    expectedAmount: number;
    actualAmount?: number;
    providerReference?: string;
    reason?: string;
  }) {
    return this.recordMismatch({
      relatedRecordType: "DeductionEvent",
      relatedRecordId: params.deductionEventId,
      exceptionType: params.reason ?? "DEDUCTION_FAILED",
      expectedAmount: params.expectedAmount,
      actualAmount: params.actualAmount ?? 0,
      providerReference: params.providerReference,
    });
  }
}

export const reconciliationService = new ReconciliationService();
