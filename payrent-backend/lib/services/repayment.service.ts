import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { auditService } from "@/lib/services/audit.service";
import { notifyComplianceEvent } from "@/lib/services/verification-notifications";
import type { InstallmentStatus } from "@prisma/client";

const REMINDER_DAYS_BEFORE = [3, 1];
const OVERDUE_ESCALATION_DAYS = 30;

export class RepaymentService {
  async recordInstallmentPayment(params: {
    installmentId: string;
    amountPaid: number;
    source: "wallet" | "mandate";
    providerReference?: string;
  }) {
    const installment = await prisma.installment.findUnique({
      where: { id: params.installmentId },
      include: {
        repaymentPlan: {
          include: {
            financing: {
              include: {
                investment: { include: { lender: { include: { user: true } } } },
                tenant: { include: { user: true } },
                property: true,
              },
            },
          },
        },
      },
    });

    if (!installment) {
      throw new Error("Installment not found");
    }

    const financing = installment.repaymentPlan.financing;
    const newAmountPaid = installment.amountPaid.plus(
      new Prisma.Decimal(params.amountPaid)
    );
    const isFullyPaid = newAmountPaid.gte(installment.amount);

    const updated = await prisma.installment.update({
      where: { id: params.installmentId },
      data: {
        amountPaid: newAmountPaid,
        status: isFullyPaid ? "PAID" : "PARTIAL",
        paidAt: new Date(),
      },
    });

    const lenderUserId = financing.investment?.lender?.user?.id;
    const tenantUserId = financing.tenant.userId;

    await notificationService.create({
      userId: tenantUserId,
      title: "Repayment received",
      body: `GHS ${params.amountPaid.toLocaleString()} was applied to your repayment for ${financing.property.name}.`,
      metadata: {
        installmentId: params.installmentId,
        source: params.source,
        financingRequestId: financing.id,
      },
    });

    if (lenderUserId) {
      await notificationService.create({
        userId: lenderUserId,
        title: "Borrower repayment received",
        body: `GHS ${params.amountPaid.toLocaleString()} received for ${financing.property.name} (installment ${installment.instalmentNumber}).`,
        metadata: {
          installmentId: params.installmentId,
          financingRequestId: financing.id,
        },
      });
    }

    await auditService.log({
      userId: tenantUserId,
      action: "INSTALLMENT_PAYMENT_RECORDED",
      entity: "Installment",
      entityId: params.installmentId,
      metadata: {
        amount: params.amountPaid,
        source: params.source,
        providerReference: params.providerReference,
        financingRequestId: financing.id,
      },
    });

    if (isFullyPaid) {
      await this.checkFinancingCompletion(financing.id);
    }

    return updated;
  }

  async checkFinancingCompletion(financingRequestId: string) {
    const financing = await prisma.financingRequest.findUnique({
      where: { id: financingRequestId },
      include: {
        repaymentPlan: { include: { installments: true } },
        tenant: { include: { user: true } },
        investment: { include: { lender: { include: { user: true } } } },
      },
    });

    if (!financing?.repaymentPlan) return;

    const allPaid = financing.repaymentPlan.installments.every(
      (i) => i.status === "PAID"
    );

    if (!allPaid) return;

    await prisma.financingRequest.update({
      where: { id: financingRequestId },
      data: { status: "CLOSED" },
    });

    await notificationService.create({
      userId: financing.tenant.userId,
      title: "Financing paid off",
      body: "Congratulations! You have completed all repayments for your financing.",
      metadata: { financingRequestId },
    });

    const lenderUserId = financing.investment?.lender?.user?.id;
    if (lenderUserId) {
      await notificationService.create({
        userId: lenderUserId,
        title: "Financing fully repaid",
        body: `All installments have been paid for financing ${financingRequestId.slice(0, 8)}.`,
        metadata: { financingRequestId },
      });
    }
  }

  async markOverdueInstallments() {
    const now = new Date();
    const overdue = await prisma.installment.updateMany({
      where: {
        status: { in: ["PENDING", "PARTIAL"] },
        dueDate: { lt: now },
        repaymentPlan: {
          financing: {
            status: { in: ["REPAYMENT_ACTIVE", "DISBURSED", "FUNDED"] },
          },
        },
      },
      data: { status: "OVERDUE" },
    });

    const defaultedCandidates = await prisma.financingRequest.findMany({
      where: {
        status: { in: ["REPAYMENT_ACTIVE", "DISBURSED", "FUNDED"] },
        repaymentPlan: {
          installments: {
            some: {
              status: "OVERDUE",
              dueDate: {
                lt: new Date(
                  now.getTime() - OVERDUE_ESCALATION_DAYS * 24 * 60 * 60 * 1000
                ),
              },
            },
          },
        },
      },
      include: {
        tenant: { include: { user: true } },
        investment: { include: { lender: { include: { user: true } } } },
        property: true,
        repaymentPlan: { include: { installments: true } },
      },
    });

    let defaulted = 0;
    for (const financing of defaultedCandidates) {
      const overdueCount =
        financing.repaymentPlan?.installments.filter(
          (i) => i.status === "OVERDUE"
        ).length ?? 0;
      if (overdueCount < 2) continue;

      await prisma.financingRequest.update({
        where: { id: financing.id },
        data: { status: "DEFAULTED" },
      });
      defaulted += 1;

      await notificationService.create({
        userId: financing.tenant.userId,
        title: "Account flagged for review",
        body: `Your financing for ${financing.property.name} has overdue repayments and is flagged for review.`,
        sendEmail: true,
      });

      const lenderUserId = financing.investment?.lender?.user?.id;
      if (lenderUserId) {
        await notificationService.create({
          userId: lenderUserId,
          title: "Borrower account defaulted",
          body: `Financing for ${financing.property.name} has been flagged as defaulted due to overdue repayments.`,
        });
      }

      await notifyComplianceEvent(
        "Overdue financing flagged",
        `Financing ${financing.id} for ${financing.tenant.user.email} on "${financing.property.name}" has ${overdueCount} overdue installments.`,
        { financingRequestId: financing.id }
      );
    }

    return { markedOverdue: overdue.count, defaulted };
  }

  async sendRepaymentReminders() {
    const now = new Date();
    let sent = 0;

    for (const daysBefore of REMINDER_DAYS_BEFORE) {
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() + daysBefore);
      windowStart.setHours(0, 0, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setHours(23, 59, 59, 999);

      const installments = await prisma.installment.findMany({
        where: {
          status: { in: ["PENDING", "PARTIAL"] },
          dueDate: { gte: windowStart, lte: windowEnd },
          repaymentPlan: {
            financing: { status: { in: ["REPAYMENT_ACTIVE", "DISBURSED", "FUNDED"] } },
          },
        },
        include: {
          repaymentPlan: {
            include: {
              financing: {
                include: {
                  tenant: { include: { user: true } },
                  property: true,
                },
              },
            },
          },
        },
      });

      for (const inst of installments) {
        const reminderKey = `T-${daysBefore}`;
        const lastMeta = inst.lastReminderAt;
        if (
          lastMeta &&
          lastMeta > new Date(now.getTime() - 20 * 60 * 60 * 1000)
        ) {
          continue;
        }

        const financing = inst.repaymentPlan.financing;
        const amountDue = Number(inst.amount) - Number(inst.amountPaid);

        await notificationService.send({
          userId: financing.tenant.userId,
          type: "REPAYMENT_REMINDER",
          channels: ["IN_APP", "EMAIL"],
          title: `Repayment due in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`,
          message: `GHS ${amountDue.toLocaleString()} is due on ${inst.dueDate.toLocaleDateString()} for ${financing.property.name}.`,
          metadata: {
            installmentId: inst.id,
            daysBefore,
            reminderKey,
          },
        });

        await prisma.installment.update({
          where: { id: inst.id },
          data: { lastReminderAt: now },
        });
        sent += 1;
      }
    }

    const overdueInstallments = await prisma.installment.findMany({
      where: {
        status: "OVERDUE",
        repaymentPlan: {
          financing: { status: { in: ["REPAYMENT_ACTIVE", "DISBURSED", "FUNDED", "DEFAULTED"] } },
        },
      },
      include: {
        repaymentPlan: {
          include: {
            financing: {
              include: {
                tenant: { include: { user: true } },
                property: true,
              },
            },
          },
        },
      },
      take: 100,
    });

    for (const inst of overdueInstallments) {
      const daysSinceReminder = inst.lastReminderAt
        ? (now.getTime() - inst.lastReminderAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      if (daysSinceReminder < 3) continue;

      const financing = inst.repaymentPlan.financing;
      const amountDue = Number(inst.amount) - Number(inst.amountPaid);

      await notificationService.send({
        userId: financing.tenant.userId,
        type: "REPAYMENT_OVERDUE",
        channels: ["IN_APP", "EMAIL", "SMS"],
        title: "Overdue repayment",
        message: `Your repayment of GHS ${amountDue.toLocaleString()} for ${financing.property.name} is overdue. Please pay as soon as possible.`,
        metadata: { installmentId: inst.id },
      });

      await prisma.installment.update({
        where: { id: inst.id },
        data: { lastReminderAt: now },
      });
      sent += 1;
    }

    return { sent };
  }
}

export const repaymentService = new RepaymentService();
