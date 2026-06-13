import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import { AppError } from "@/lib/errors";
import type { ApproveFinancingInput } from "@/lib/validations/financing";

export class FinancingService {
  async createRequest(
    tenantId: string,
    propertyId: string,
    requestedAmount: number,
    durationMonths: number,
    notes?: string,
    applicationId?: string
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.kycVerified) {
      throw new AppError("Complete Ghana Card verification before requesting financing", 400);
    }

    const verifiedBank = await prisma.bankAccount.findFirst({
      where: { userId: tenant.userId, isVerified: true },
    });
    if (!verifiedBank) {
      throw new AppError("Add and validate a bank account before requesting financing", 400);
    }

    if (applicationId) {
      const application = await prisma.propertyApplication.findFirst({
        where: { id: applicationId, tenantId, status: "APPROVED" },
      });
      if (!application) {
        throw new AppError("An approved property application is required", 400);
      }
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

  async approveRequest(
    lenderId: string,
    input: ApproveFinancingInput
  ) {
    const request = await prisma.financingRequest.findUnique({
      where: { id: input.financingRequestId },
      include: {
        tenant: { include: { user: true } },
        property: true,
      },
    });

    if (!request || !["PENDING", "UNDER_REVIEW", "READY_FOR_LENDER_REVIEW"].includes(request.status)) {
      throw new AppError("Financing request not found or already processed");
    }

    const lender = await prisma.lender.findUnique({
      where: { id: lenderId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!lender?.user) throw new AppError("Lender not found");

    const lenderBalance = await walletService.getBalance(
      lender.userId,
      "LENDER"
    );
    if (Number(lenderBalance.balance) < input.amount) {
      throw new AppError("Insufficient lender wallet balance");
    }

    const totalWithInterest =
      input.amount * (1 + input.interestRate / 100);
    const monthlyPayment =
      input.planType === "MONTHLY"
        ? totalWithInterest / request.durationMonths
        : totalWithInterest / request.durationMonths;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + request.durationMonths);

    await walletService.transfer(
      lender.userId,
      "LENDER",
      request.tenant.userId,
      "TENANT",
      input.amount,
      `Financing for ${request.property.name}`
    );

    const result = await prisma.$transaction(async (tx) => {
      const investment = await tx.investment.create({
        data: {
          lenderId,
          financingRequestId: request.id,
          amount: new Prisma.Decimal(input.amount),
          interestRate: new Prisma.Decimal(input.interestRate),
        },
      });

      const repaymentPlan = await tx.repaymentPlan.create({
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

      await tx.installment.createMany({
        data: installments.map((inst) => ({
          repaymentPlanId: repaymentPlan.id,
          amount: new Prisma.Decimal(inst.amount),
          dueDate: new Date(inst.dueDate),
          status: "PENDING",
        })),
      });

      await tx.financingRequest.update({
        where: { id: request.id },
        data: {
          status: "DISBURSED",
          approvedAmount: new Prisma.Decimal(input.amount),
          approvedAt: new Date(),
          disbursedAt: new Date(),
        },
      });

      return { investment, repaymentPlan };
    });

    await notificationService.create({
      userId: request.tenant.userId,
      title: "Financing Approved",
      body: `Your financing request for ${request.property.name} has been approved.`,
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
      title: "Financing Declined",
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
              },
            },
          },
        },
      },
    });

    if (!installment || installment.status === "PAID") {
      throw new AppError("Installment not found or already paid");
    }

    const amount = Number(installment.amount);
    const lenderUserId =
      installment.repaymentPlan.financing.investment?.lender?.user?.id;

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
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  async getLenderPortfolio(lenderId: string) {
    return prisma.financingRequest.findMany({
      where: {
        status: { in: ["DISBURSED", "REPAYMENT_ACTIVE", "FUNDED"] },
        investment: { lenderId },
      },
      include: {
        property: true,
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
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const financingService = new FinancingService();
