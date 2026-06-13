import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { auditService } from "@/lib/services/audit.service";
import { AppError } from "@/lib/errors";
import type { CreateApplicationInput, ReviewApplicationInput } from "@/lib/validations/application";

export class ApplicationService {
  async create(tenantId: string, userId: string, input: CreateApplicationInput) {
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      include: { landlord: { include: { user: true } } },
    });

    if (!property || property.status !== "ACTIVE") {
      throw new AppError("Property is not available for applications", 400);
    }

    const existing = await prisma.propertyApplication.findFirst({
      where: {
        tenantId,
        propertyId: input.propertyId,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED"] },
      },
    });
    if (existing) {
      throw new AppError("You already have an active application for this property", 409);
    }

    const application = await prisma.propertyApplication.create({
      data: {
        propertyId: input.propertyId,
        tenantId,
        status: "SUBMITTED",
        requestedMoveInDate: input.requestedMoveInDate
          ? new Date(input.requestedMoveInDate)
          : undefined,
        notes: input.notes,
      },
      include: {
        property: { include: { images: { take: 1 } } },
        tenant: { include: { user: true } },
      },
    });

    await notificationService.create({
      userId: property.landlord.userId,
      title: "New tenant application",
      body: `A tenant applied for ${property.name}.`,
    });

    await auditService.log({
      userId,
      action: "APPLICATION_SUBMITTED",
      entity: "PropertyApplication",
      entityId: application.id,
    });

    return application;
  }

  async listForTenant(tenantId: string) {
    return prisma.propertyApplication.findMany({
      where: { tenantId },
      include: {
        property: { include: { images: { take: 1 }, landlord: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listForLandlord(landlordId: string) {
    return prisma.propertyApplication.findMany({
      where: { property: { landlordId } },
      include: {
        property: { include: { images: { take: 1 } } },
        tenant: { include: { user: { select: { email: true, phone: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listForAgent(agentProfileId: string) {
    return prisma.propertyApplication.findMany({
      where: { property: { agentUserId: agentProfileId } },
      include: {
        property: { include: { images: { take: 1 } } },
        tenant: { include: { user: { select: { email: true, phone: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async review(
    applicationId: string,
    reviewerUserId: string,
    input: ReviewApplicationInput
  ) {
    const application = await prisma.propertyApplication.findUnique({
      where: { id: applicationId },
      include: {
        property: { include: { landlord: true } },
        tenant: { include: { user: true } },
      },
    });

    if (!application) throw new AppError("Application not found", 404);

    const statusMap = {
      APPROVE: "APPROVED" as const,
      REJECT: "REJECTED" as const,
      CLARIFICATION: "CLARIFICATION_REQUIRED" as const,
    };

    const updated = await prisma.propertyApplication.update({
      where: { id: applicationId },
      data: {
        status: statusMap[input.decision],
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
        decisionReason: input.decisionReason,
      },
      include: { property: true },
    });

    await notificationService.create({
      userId: application.tenant.userId,
      title: `Application ${statusMap[input.decision].toLowerCase().replace("_", " ")}`,
      body: `Your application for ${application.property.name} was updated.`,
    });

    await auditService.log({
      userId: reviewerUserId,
      action: `APPLICATION_${input.decision}`,
      entity: "PropertyApplication",
      entityId: applicationId,
    });

    return updated;
  }
}

export const applicationService = new ApplicationService();
