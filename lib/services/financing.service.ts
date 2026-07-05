import { Prisma } from "@prisma/client";
import { prisma, runTransaction } from "@/lib/db/prisma";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import { settlementService } from "@/lib/services/settlement.service";
import { AppError } from "@/lib/errors";
import type { ApproveFinancingInput } from "@/lib/validations/financing";
import { tenantFinancingDocService } from "@/lib/services/tenant-financing-doc.service";

export class FinancingService {
  private async assertEligibility(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.kycVerified) {
      throw new AppError("Complete identity verification before requesting financing", 400);
    }

    const verifiedBank = await prisma.bankAccount.findFirst({
      where: { userId: tenant.userId, isVerified: true },
    });
    if (!verifiedBank) {
      throw new AppError("Add and validate a bank account before requesting financing", 400);
    }

    return tenant;
  }

  async createRequest(
    tenantId: string,
    propertyId: string,
    requestedAmount: number,
    durationMonths: number,
    notes?: string,
    applicationId?: string
  ) {
    await this.assertEligibility(tenantId);
    await tenantFinancingDocService.assertFinancingDocsApproved(tenantId);

    if (!applicationId) {
      throw new AppError("An approved property application is required", 400);
    }

    const application = await prisma.propertyApplication.findFirst({
      where: { id: applicationId, tenantId, status: "APPROVED" },
    });
    if (!application) {
      throw new AppError("An approved property application is required", 400);
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property || property.status !== "ACTIVE") {
      throw new AppError("Property not available", 400);
    }

    return prisma.financingRequest.create({
      data: {
        tenantId,
        propertyId,
        applicationId,
        requestedAmount: new Prisma.Decimal(requestedAmount),
        durationMonths,
        notes,
        status: "MANDATE_PENDING",
      },
      include: { property: true, tenant: { include: { user: true } }, application: true },
    });
  }

  async approveRequest(lenderId: string, input: ApproveFinancingInput) {
    const request = await prisma.financingRequest.findUnique({
      where: { id: input.financingRequestId },
      include: {
        tenant: { include: { user: true } },
        property: { include: { landlord: { include: { user: true } } } },
        mandate: true,
      },
    });

    if (
      !request ||
      !["PENDING", "UNDER_REVIEW", "READY_FOR_LENDER_REVIEW"].includes(request.status)
    ) {
      throw new AppError("Financing request not found or already processed");
    }

    if (!request.mandate || request.mandate.status !== "ACTIVE") {
      throw new AppError("An active repayment mandate is required before approval", 400);
    }

    const lender = await prisma.lender.findUnique({
      where: { id: lenderId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!lender?.user) throw new AppError("Lender not found");

    const lenderBalance = await walletService.getBalance(lender.userId, "LENDER");
    if (Number(lenderBalance.balance) < input.amount) {
      throw new AppError("Insufficient lender wallet balance");
    }

    const totalWithInterest = input.amount * (1 + input.interestRate / 100);
    const monthlyPayment = totalWithInterest / request.durationMonths;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + request.durationMonths);

    const landlordUserId = request.property.landlord.userId;

    await walletService.transfer(
      lender.userId,
      "LENDER",
      landlordUserId,
      "LANDLORD",
      input.amount,
      `Financing disbursement for ${request.property.name}`
    );

    const result = await runTransaction(async (db) => {
      const investment = await db.investment.create({
        data: {
          lenderId,
          financingRequestId: request.id,
          amount: new Prisma.Decimal(input.amount),
          interestRate: new Prisma.Decimal(input.interestRate),
        },
      });

      const repaymentPlan = await db.repaymentPlan.create({
        data: {
          financingId: request.id,
          planType: input.planType,
          totalAmount: new Prisma.Decimal(totalWithInterest),
          interestRate: new Prisma.Decimal(input.interestRate),
          startDate,
          endDate,
        },
      });

      const installments =
        input.customSchedule ??
        Array.from({ length: request.durationMonths }, (_, i) => {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          return { amount: monthlyPayment, dueDate: dueDate.toISOString() };
        });

      await db.installment.createMany({
        data: installments.map((inst, index) => ({
          repaymentPlanId: repaymentPlan.id,
          instalmentNumber: index + 1,
          amount: new Prisma.Decimal(inst.amount),
          dueDate: new Date(inst.dueDate),
          status: "PENDING",
        })),
      });

      await db.financingRequest.update({
        where: { id: request.id },
        data: {
          status: "REPAYMENT_ACTIVE",
          approvedAmount: new Prisma.Decimal(input.amount),
          approvedAt: new Date(),
          disbursedAt: new Date(),
        },
      });

      return { investment, repaymentPlan };
    });

    await settlementService.createFromFinancing(request.id, lender.userId);

    await notificationService.create({
      userId: request.tenant.userId,
      title: "Financing approved",
      body: `Your financing request for ${request.property.name} has been approved. Repayments are now active.`,
    });

    await notificationService.create({
      userId: landlordUserId,
      title: "Financing disbursed",
      body: `Rent financing for ${request.property.name} has been disbursed to your wallet.`,
    });

    return result;
  }

  async rejectRequest(financingRequestId: string, _lenderId: string) {
    const request = await prisma.financingRequest.update({
      where: {
        id: financingRequestId,
        status: { in: ["PENDING", "UNDER_REVIEW", "READY_FOR_LENDER_REVIEW"] },
      },
      data: { status: "REJECTED", rejectedAt: new Date() },
      include: { tenant: { include: { user: true } }, property: true },
    });

    await notificationService.create({
      userId: request.tenant.userId,
      title: "Financing declined",
      body: `Your financing request for ${request.property.name} was not approved.`,
    });

    return request;
  }

  async payInstallment(tenantUserId: string, installmentId: string) {
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        repaymentPlan: {
          include: {
            financing: {
              include: {
                investment: { include: { lender: { include: { user: true } } } },
                tenant: true,
                mandate: true,
              },
            },
          },
        },
      },
    });

    if (!installment || installment.status === "PAID") {
      throw new AppError("Installment not found or already paid");
    }

    const financing = installment.repaymentPlan.financing;
    if (financing.mandate?.status === "ACTIVE") {
      const { mandateExecutionService } = await import(
        "@/lib/services/mandate-execution.service"
      );
      const result = await mandateExecutionService.executeDeduction(
        installmentId,
        financing.mandate.id
      );
      if (result.status === "SUCCESSFUL") {
        return prisma.installment.findUniqueOrThrow({ where: { id: installmentId } });
      }
    }

    const amount = Number(installment.amount);
    const lenderUserId = financing.investment?.lender?.user?.id;
    if (!lenderUserId) throw new AppError("Lender not found");

    await walletService.transfer(
      tenantUserId,
      "TENANT",
      lenderUserId,
      "LENDER",
      amount,
      "Installment payment"
    );

    return prisma.installment.update({
      where: { id: installmentId },
      data: { status: "PAID", paidAt: new Date(), amountPaid: installment.amount },
    });
  }

  async getLenderPortfolio(lenderId: string) {
    return prisma.financingRequest.findMany({
      where: {
        status: { in: ["DISBURSED", "REPAYMENT_ACTIVE", "FUNDED", "CLOSED"] },
        investment: { lenderId },
      },
      include: {
        property: true,
        mandate: true,
        investment: true,
        repaymentPlan: { include: { installments: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getPendingForLender() {
    return prisma.financingRequest.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW", "READY_FOR_LENDER_REVIEW"] } },
      include: {
        tenant: { include: { user: { select: { email: true, image: true } } } },
        property: { include: { images: { take: 1 } } },
        mandate: true,
        application: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const financingService = new FinancingService();
