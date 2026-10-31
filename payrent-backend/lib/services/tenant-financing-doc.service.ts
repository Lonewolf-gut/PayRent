import {
  TenantFinancingDocType,
  type FinancingRequestDocument,
} from "@prisma/client";
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
    if (!tenant) throw new AppError("Customer profile required", 403);

    const requiredTypes = getRequiredFinancingDocTypes(tenant.entityType);
    const docs = await prisma.financingRequestDocument.findMany({
      where: { financingRequest: { tenantId: tenant.id } },
      include: { financingRequest: { select: { id: true, status: true, propertyId: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const approved = requiredTypes.every((type) =>
      docs.some(
        (doc: FinancingRequestDocument) =>
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

  async upload(
    userId: string,
    documentType: TenantFinancingDocType,
    file: File,
    financingRequestId?: string
  ) {
    const tenant = await prisma.tenant.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!tenant) throw new AppError("Customer profile required", 403);

    if (!tenant.kycVerified) {
      throw new AppError(
        "Complete identity verification on your dashboard before uploading financing documents.",
        403,
        "KYC_REQUIRED"
      );
    }

    const requiredTypes = getRequiredFinancingDocTypes(tenant.entityType);
    if (!requiredTypes.includes(documentType)) {
      throw new AppError("This document is not required for your account type.", 400);
    }

    const financingRequest = financingRequestId
      ? await prisma.financingRequest.findFirst({
          where: { id: financingRequestId, tenantId: tenant.id },
        })
      : await prisma.financingRequest.findFirst({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
        });

    if (!financingRequest) {
      throw new AppError(
        "Submit or open a financing request before uploading payslip and bank statement.",
        400,
        "FINANCING_REQUEST_REQUIRED"
      );
    }

    const fileUrl = await saveFinancingDocument(file, userId);
    const doc = await prisma.financingRequestDocument.upsert({
      where: {
        financingRequestId_documentType: {
          financingRequestId: financingRequest.id,
          documentType,
        },
      },
      create: {
        financingRequestId: financingRequest.id,
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
      { tenantId: tenant.id, documentId: doc.id, financingRequestId: financingRequest.id }
    );

    return doc;
  }

  async listForAdmin(status?: "PENDING" | "APPROVED" | "REJECTED") {
    const docs = await prisma.financingRequestDocument.findMany({
      where: status ? { status } : undefined,
      include: {
        financingRequest: {
          include: {
            tenant: {
              include: {
                user: { select: { id: true, email: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const userIds = [
      ...new Set(docs.map((doc) => doc.financingRequest.tenant.userId)),
    ];
    const [kycDocs, verifications] = await Promise.all([
      userIds.length
        ? prisma.kycDocument.findMany({
            where: { userId: { in: userIds } },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      userIds.length
        ? prisma.verification.findMany({
            where: { userId: { in: userIds }, status: "APPROVED" },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    return docs.map((doc) => ({
      ...doc,
      tenant: doc.financingRequest.tenant,
      kycSummary: {
        fullName: doc.financingRequest.tenant.fullName,
        kycVerified: doc.financingRequest.tenant.kycVerified,
        employmentVerified: doc.financingRequest.tenant.employmentVerified,
        addressVerified: doc.financingRequest.tenant.addressVerified,
        entityType: doc.financingRequest.tenant.entityType,
        email: doc.financingRequest.tenant.user.email,
        phone: doc.financingRequest.tenant.user.phone,
        kycDocuments: kycDocs.filter(
          (item) => item.userId === doc.financingRequest.tenant.userId
        ),
        verifications: verifications.filter(
          (item) => item.userId === doc.financingRequest.tenant.userId
        ),
      },
    }));
  }

  async review(
    documentId: string,
    adminUserId: string,
    status: "APPROVED" | "REJECTED",
    reviewNotes?: string
  ) {
    const doc = await prisma.financingRequestDocument.update({
      where: { id: documentId },
      data: {
        status,
        reviewNotes,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
      },
      include: {
        financingRequest: {
          include: {
            tenant: { include: { user: { select: { id: true, email: true } } } },
          },
        },
      },
    });

    await notifyUserInAppAndEmail(
      doc.financingRequest.tenant.user.id,
      status === "APPROVED"
        ? "Financing document approved"
        : "Financing document needs attention",
      status === "APPROVED"
        ? `Your ${FINANCING_DOC_LABELS[doc.documentType as TenantFinancingDocType]} was approved.`
        : `Your ${FINANCING_DOC_LABELS[doc.documentType as TenantFinancingDocType]} was rejected.${reviewNotes ? ` Note: ${reviewNotes}` : ""}`
    );

    return doc;
  }

  async assertFinancingDocsApproved(financingRequestId: string) {
    const request = await prisma.financingRequest.findUnique({
      where: { id: financingRequestId },
      include: { tenant: true },
    });
    if (!request) throw new AppError("Financing request not found", 404);

    const requiredTypes = getRequiredFinancingDocTypes(request.tenant.entityType);
    const docs = await prisma.financingRequestDocument.findMany({
      where: { financingRequestId },
    });

    const missing = requiredTypes.filter(
      (type) =>
        !docs.some(
          (doc: FinancingRequestDocument) =>
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
