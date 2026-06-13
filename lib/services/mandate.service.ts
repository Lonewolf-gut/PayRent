import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { auditService } from "@/lib/services/audit.service";
import { AppError } from "@/lib/errors";
import type {
  CreateMandateInput,
  SubmitMandateInput,
  ReviewMandateInput,
} from "@/lib/validations/mandate";

export class MandateService {
  async create(tenantId: string, userId: string, input: CreateMandateInput) {
    const financing = await prisma.financingRequest.findFirst({
      where: { id: input.financingRequestId, tenantId },
    });
    if (!financing) throw new AppError("Financing request not found", 404);

    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: input.bankAccountId, userId },
    });
    if (!bankAccount) throw new AppError("Bank account not found", 404);
    if (!bankAccount.isVerified) {
      throw new AppError("Bank account must be validated before creating a mandate", 400);
    }

    const mandate = await prisma.$transaction(async (tx) => {
      const created = await tx.mandate.create({
        data: {
          tenantId,
          bankAccountId: input.bankAccountId,
          mandateType: input.mandateType,
          mandateSource: input.mandateSource,
          status:
            input.mandateSource === "SCANNED_UPLOAD"
              ? "PENDING_SUBMISSION"
              : "BANK_PROCESSING",
          documentUrl: input.documentUrl,
          providerName: "MandateAdapter",
          providerReference: `man_${Date.now()}`,
        },
      });

      await tx.financingRequest.update({
        where: { id: input.financingRequestId },
        data: {
          mandateId: created.id,
          status: "MANDATE_PENDING",
        },
      });

      return created;
    });

    await auditService.log({
      userId,
      action: "MANDATE_CREATED",
      entity: "Mandate",
      entityId: mandate.id,
    });

    return mandate;
  }

  async submit(mandateId: string, tenantId: string, userId: string, input: SubmitMandateInput) {
    const mandate = await prisma.mandate.findFirst({
      where: { id: mandateId, tenantId },
    });
    if (!mandate) throw new AppError("Mandate not found", 404);

    const updated = await prisma.mandate.update({
      where: { id: mandateId },
      data: {
        status: mandate.mandateSource === "SCANNED_UPLOAD" ? "ADMIN_REVIEW" : "BANK_PROCESSING",
        documentUrl: input.documentUrl ?? mandate.documentUrl,
        submittedAt: new Date(),
      },
    });

    await prisma.adminReviewRecord.create({
      data: {
        reviewType: "MANDATE",
        relatedEntityType: "Mandate",
        relatedEntityId: mandateId,
        status: "PENDING",
      },
    });

    await auditService.log({
      userId,
      action: "MANDATE_SUBMITTED",
      entity: "Mandate",
      entityId: mandateId,
    });

    return updated;
  }

  async review(mandateId: string, adminUserId: string, input: ReviewMandateInput) {
    const mandate = await prisma.mandate.findUnique({
      where: { id: mandateId },
      include: {
        tenant: { include: { user: true } },
        financingRequest: true,
      },
    });
    if (!mandate) throw new AppError("Mandate not found", 404);

    const isApproved = input.decision === "APPROVE";

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.mandate.update({
        where: { id: mandateId },
        data: {
          status: isApproved ? "ACTIVE" : "REJECTED",
          activatedAt: isApproved ? new Date() : undefined,
          rejectedReason: isApproved ? undefined : input.rejectedReason,
        },
      });

      if (mandate.financingRequest && isApproved) {
        await tx.financingRequest.update({
          where: { id: mandate.financingRequest.id },
          data: { status: "READY_FOR_LENDER_REVIEW" },
        });
      }

      await tx.adminReviewRecord.updateMany({
        where: {
          relatedEntityType: "Mandate",
          relatedEntityId: mandateId,
          status: "PENDING",
        },
        data: {
          status: isApproved ? "APPROVED" : "REJECTED",
          assignedAdminUserId: adminUserId,
          decision: input.decision,
          decisionNote: input.rejectedReason,
          completedAt: new Date(),
        },
      });

      return result;
    });

    await notificationService.create({
      userId: mandate.tenant.userId,
      title: isApproved ? "Mandate activated" : "Mandate rejected",
      body: isApproved
        ? "Your repayment mandate is now active."
        : input.rejectedReason ?? "Your mandate was rejected. Please resubmit.",
    });

    await auditService.log({
      userId: adminUserId,
      action: `MANDATE_${input.decision}`,
      entity: "Mandate",
      entityId: mandateId,
    });

    return updated;
  }

  async listForTenant(tenantId: string) {
    return prisma.mandate.findMany({
      where: { tenantId },
      include: { bankAccount: true, financingRequest: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async listPendingReview() {
    return prisma.mandate.findMany({
      where: { status: { in: ["ADMIN_REVIEW", "PENDING_MANUAL_RESOLUTION"] } },
      include: {
        tenant: { include: { user: { select: { email: true } } } },
        bankAccount: true,
      },
      orderBy: { submittedAt: "desc" },
    });
  }
}

export const mandateService = new MandateService();
