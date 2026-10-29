import type { ConsentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { CONSENT_POLICY_VERSION, CONSENT_LABELS } from "@/lib/constants/consent";
import { notifyComplianceEvent } from "@/lib/services/verification-notifications";

export type ConsentContext = {
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export class ConsentService {
  async record(
    userId: string,
    consentType: ConsentType,
    context?: ConsentContext
  ) {
    const consent = await prisma.dataConsent.create({
      data: {
        userId,
        consentType,
        version: CONSENT_POLICY_VERSION,
        granted: true,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        metadata: context?.metadata as Prisma.InputJsonValue,
      },
      include: { user: { select: { email: true, role: true } } },
    });

    await notifyComplianceEvent(
      "New consent recorded",
      `${consent.user.email} (${consent.user.role}) granted ${CONSENT_LABELS[consentType] ?? consentType}.`,
      {
        consentId: consent.id,
        userId,
        consentType,
      }
    );

    return consent;
  }

  async recordRegistrationConsents(userId: string, context?: ConsentContext) {
    const types: ConsentType[] = [
      "DATA_COLLECTION_PROCESSING",
      "TERMS_OF_SERVICE",
    ];
    const records = await Promise.all(
      types.map(async (type) => {
        return prisma.dataConsent.create({
          data: {
            userId,
            consentType: type,
            version: CONSENT_POLICY_VERSION,
            granted: true,
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
            metadata: context?.metadata as Prisma.InputJsonValue,
          },
        });
      })
    );

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });

    if (user) {
      await notifyComplianceEvent(
        "Registration consents captured",
        `${user.email} (${user.role}) accepted data processing and terms of service during registration.`,
        { userId, consentIds: records.map((r) => r.id) }
      );
    }

    return records;
  }

  async recordFinancingConsent(
    userId: string,
    financingRequestId: string,
    context?: ConsentContext
  ) {
    return this.record(userId, "FINANCING_DATA_PROCESSING", {
      ...context,
      metadata: {
        ...context?.metadata,
        financingRequestId,
      },
    });
  }

  async listForCompliance(params?: {
    consentType?: ConsentType;
    limit?: number;
    page?: number;
  }) {
    const limit = Math.min(params?.limit ?? 50, 200);
    const page = params?.page ?? 1;
    const skip = (page - 1) * limit;

    const where = params?.consentType
      ? { consentType: params.consentType }
      : undefined;

    const [items, total] = await Promise.all([
      prisma.dataConsent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { grantedAt: "desc" },
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.dataConsent.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

export const consentService = new ConsentService();
