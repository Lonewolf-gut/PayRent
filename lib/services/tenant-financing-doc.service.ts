import { TenantFinancingDocType, type TenantFinancingDocument } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { saveFinancingDocument } from "@/lib/integrations/documents";
import {
  FINANCING_DOC_LABELS,
  getRequiredFinancingDocTypes,
} from "@/lib/constants/financing-docs";
import {
  notifyAllAdminsInAppAndEmail,
  notifyUserInAppAndEmail,
} from "@/lib/services/verification-notifications";

export class TenantFinancingDocService {
  async listForTenant(userId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { userId } });
    if (!tenant) throw new AppError("Tenant profile required", 403);

    const requiredTypes = getRequiredFinancingDocTypes(tenant.entityType);
    const docs = await prisma.tenantFinancingDocument.findMany({
      where: { tenantId: tenant.id },
      orderBy: { documentType: "asc" },
    });

    const approved = requiredTypes.every((type) =>
      docs.some(
        (doc: TenantFinancingDocument) =>
          doc.documentType === type && doc.status === "APPROVED"
      )
    );

    return {
      documents: docs,
      requiredTypes,
      labels: FINANCING_DOC_LABELS,
      entityType: tenant.entityType,
      allApproved: approved,
    };
  }

  async upload(userId: string, documentType: TenantFinancingDocType, file: File) {
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!tenant) throw new AppError("Tenant profile required", 403);

    const requiredTypes = getRequiredFinancingDocTypes(tenant.entityType);
    if (!requiredTypes.includes(documentType)) {
      throw new AppError("This document is not required for your account type.", 400);
    }

    const fileUrl = await saveFinancingDocument(file, userId);
    const doc = await prisma.tenantFinancingDocument.upsert({
      where: {
        tenantId_documentType: { tenantId: tenant.id, documentType },
      },
      create: {
        tenantId: tenant.id,
        documentType,
        fileName: file.name,
        fileUrl,
        status: "PENDING",
      },
      update: {
        fileName: file.name,
        fileUrl,
        status: "PENDING",
        reviewNotes: null,
        reviewedAt: null,
        reviewedBy: null,
      },
    });

    await notifyUserInAppAndEmail(
      userId,
      "Financing document submitted",
      `Your ${FINANCING_DOC_LABELS[documentType]} was uploaded and is pending admin review.`
    );

    await notifyAllAdminsInAppAndEmail(
      "Financing documents submitted",
      `${tenant.user.email} uploaded ${FINANCING_DOC_LABELS[documentType]} for admin review.`,
      { tenantId: tenant.id, documentId: doc.id }
    );

    return doc;
  }

  async listForAdmin(status?: "PENDING" | "APPROVED" | "REJECTED") {
    return prisma.tenantFinancingDocument.findMany({
      where: status ? { status } : undefined,
      include: {
        tenant: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async review(
    documentId: string,
    adminUserId: string,
    status: "APPROVED" | "REJECTED",
    reviewNotes?: string
  ) {
    const doc = await prisma.tenantFinancingDocument.update({
      where: { id: documentId },
      data: {
        status,
        reviewNotes,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
      },
      include: {
        tenant: { include: { user: { select: { id: true, email: true } } } },
      },
    });

    await notifyUserInAppAndEmail(
      doc.tenant.user.id,
      status === "APPROVED"
        ? "Financing document approved"
        : "Financing document needs attention",
      status === "APPROVED"
        ? `Your ${FINANCING_DOC_LABELS[doc.documentType as TenantFinancingDocType]} was approved.`
        : `Your ${FINANCING_DOC_LABELS[doc.documentType as TenantFinancingDocType]} was rejected.${reviewNotes ? ` Note: ${reviewNotes}` : ""}`
    );

    return doc;
  }

  async assertFinancingDocsApproved(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError("Tenant profile required", 403);

    const requiredTypes = getRequiredFinancingDocTypes(tenant.entityType);
    const docs = await prisma.tenantFinancingDocument.findMany({
      where: { tenantId },
    });

    const missing = requiredTypes.filter(
      (type) =>
        !docs.some(
          (doc: TenantFinancingDocument) =>
            doc.documentType === type && doc.status === "APPROVED"
        )
    );

    if (missing.length > 0) {
      throw new AppError(
        `Upload and get admin approval for: ${missing.map((t) => FINANCING_DOC_LABELS[t]).join(", ")}`,
        400,
        "FINANCING_DOCS_REQUIRED"
      );
    }
  }
}

export const tenantFinancingDocService = new TenantFinancingDocService();
