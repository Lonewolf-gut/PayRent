import type { ConsentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { CONSENT_POLICY_VERSION } from "@/lib/constants/consent";

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
    return prisma.dataConsent.create({
      data: {
        userId,
        consentType,
        version: CONSENT_POLICY_VERSION,
        granted: true,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        metadata: context?.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async recordRegistrationConsents(userId: string, context?: ConsentContext) {
    const types: ConsentType[] = [
      "DATA_COLLECTION_PROCESSING",
      "TERMS_OF_SERVICE",
    ];
    return Promise.all(types.map((type) => this.record(userId, type, context)));
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
