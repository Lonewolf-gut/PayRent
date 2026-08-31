import { prisma } from "@/lib/db/prisma";

export type SuspiciousActivityFlag = {
  id: string;
  category:
    | "FAILED_PAYMENTS"
    | "UNUSUAL_LENDER_ACTIVITY"
    | "FRAUDULENT_LISTING"
    | "LOGIN_ANOMALY";
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  userId?: string | null;
  email?: string | null;
  count?: number;
  detectedAt: string;
  metadata?: Record<string, unknown>;
};

const FAILED_PAYMENT_THRESHOLD = 3;
const LENDER_APPROVAL_SPIKE_THRESHOLD = 5;
const FAILED_LOGIN_THRESHOLD = 5;

export async function detectSuspiciousActivity(): Promise<SuspiciousActivityFlag[]> {
  const flags: SuspiciousActivityFlag[] = [];

  const failedDeductions = await prisma.deductionEvent.groupBy({
    by: ["mandateId"],
    where: { status: "FAILED" },
    _count: { id: true },
    having: { id: { _count: { gte: FAILED_PAYMENT_THRESHOLD } } },
  });

  if (failedDeductions.length) {
    const mandateIds = failedDeductions.map((row) => row.mandateId);
    const mandates = await prisma.mandate.findMany({
      where: { id: { in: mandateIds } },
      include: {
        financingRequest: {
          include: {
            tenant: { include: { user: { select: { id: true, email: true } } } },
          },
        },
      },
    });

    const mandateMap = new Map(mandates.map((m) => [m.id, m]));

    for (const row of failedDeductions) {
      const mandate = mandateMap.get(row.mandateId);
      const tenantUser = mandate?.financingRequest?.tenant?.user;
      flags.push({
        id: `failed-payments-${row.mandateId}`,
        category: "FAILED_PAYMENTS",
        severity: row._count.id >= 5 ? "HIGH" : "MEDIUM",
        title: "Repeated failed repayments",
        description: `${row._count.id} failed deduction attempts on record for mandate ${row.mandateId.slice(0, 8)}…`,
        entityType: "Mandate",
        entityId: row.mandateId,
        userId: tenantUser?.id,
        email: tenantUser?.email,
        count: row._count.id,
        detectedAt: new Date().toISOString(),
        metadata: {
          financingRequestId: mandate?.financingRequest?.id,
        },
      });
    }
  }

  const reconciliationFlags = await prisma.reconciliationException.findMany({
    where: {
      status: { in: ["UNDER_REVIEW", "UNMATCHED_PAYMENT", "MISSING_CONFIRMATION"] },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const exception of reconciliationFlags) {
    flags.push({
      id: `reconciliation-${exception.id}`,
      category: "FAILED_PAYMENTS",
      severity: "MEDIUM",
      title: "Unresolved payment reconciliation",
      description: `${exception.exceptionType}: ${exception.relatedRecordType} ${exception.relatedRecordId}`,
      entityType: exception.relatedRecordType,
      entityId: exception.relatedRecordId,
      detectedAt: exception.createdAt.toISOString(),
      metadata: {
        exceptionType: exception.exceptionType,
        status: exception.status,
      },
    });
  }

  const approvedRequests = await prisma.financingRequest.findMany({
    where: {
      approvedAt: { not: null },
      status: { in: ["REPAYMENT_ACTIVE", "DISBURSED", "FUNDED", "APPROVED"] },
    },
    include: {
      investment: {
        include: {
          lender: { include: { user: { select: { id: true, email: true } } } },
        },
      },
    },
  });

  const approvalsByLender = new Map<
    string,
    { count: number; email: string; lenderUserId: string }
  >();

  for (const request of approvedRequests) {
    const lenderUser = request.investment?.lender?.user;
    if (!lenderUser) continue;
    const current = approvalsByLender.get(lenderUser.id) ?? {
      count: 0,
      email: lenderUser.email,
      lenderUserId: lenderUser.id,
    };
    current.count += 1;
    approvalsByLender.set(lenderUser.id, current);
  }

  for (const [lenderUserId, stats] of approvalsByLender) {
    if (stats.count < LENDER_APPROVAL_SPIKE_THRESHOLD) continue;
    flags.push({
      id: `lender-spike-${lenderUserId}`,
      category: "UNUSUAL_LENDER_ACTIVITY",
      severity: stats.count >= 10 ? "HIGH" : "MEDIUM",
      title: "High lender approval volume",
      description: `${stats.email} has approved ${stats.count} financing agreements on record.`,
      entityType: "User",
      entityId: lenderUserId,
      userId: lenderUserId,
      email: stats.email,
      count: stats.count,
      detectedAt: new Date().toISOString(),
    });
  }

  const suspiciousListings = await prisma.property.findMany({
    where: {
      OR: [{ status: "PENDING_VERIFICATION" }, { status: "INACTIVE" }],
    },
    include: {
      landlord: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              verifications: {
                where: { type: "IDENTITY" },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { status: true },
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  for (const property of suspiciousListings) {
    const landlordUser = property.landlord.user;
    const identityStatus = landlordUser.verifications[0]?.status;
    const unverifiedMerchant = identityStatus !== "APPROVED";
    const isPending = property.status === "PENDING_VERIFICATION";

    if (!isPending && !unverifiedMerchant) continue;

    flags.push({
      id: `listing-${property.id}`,
      category: "FRAUDULENT_LISTING",
      severity: unverifiedMerchant ? "HIGH" : "MEDIUM",
      title: isPending ? "Listing pending verification" : "Suspended listing",
      description: isPending
        ? `"${property.name}" from ${landlordUser.email} awaits verification.`
        : `"${property.name}" from ${landlordUser.email} is inactive or suspended.`,
      entityType: "Property",
      entityId: property.id,
      userId: landlordUser.id,
      email: landlordUser.email,
      detectedAt: property.updatedAt.toISOString(),
      metadata: {
        status: property.status,
        merchantVerified: !unverifiedMerchant,
      },
    });
  }

  const failedLogins = await prisma.loginLog.groupBy({
    by: ["email"],
    where: {
      success: false,
      email: { not: null },
    },
    _count: { id: true },
    having: { id: { _count: { gte: FAILED_LOGIN_THRESHOLD } } },
  });

  for (const row of failedLogins) {
    if (!row.email) continue;
    flags.push({
      id: `login-failures-${row.email}`,
      category: "LOGIN_ANOMALY",
      severity: row._count.id >= 10 ? "HIGH" : "MEDIUM",
      title: "Repeated failed login attempts",
      description: `${row._count.id} failed logins on record for ${row.email}.`,
      entityType: "LoginLog",
      entityId: row.email,
      email: row.email,
      count: row._count.id,
      detectedAt: new Date().toISOString(),
    });
  }

  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return flags.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

export async function countSuspiciousActivityByCategory() {
  const flags = await detectSuspiciousActivity();
  return {
    total: flags.length,
    failedPayments: flags.filter((f) => f.category === "FAILED_PAYMENTS").length,
    unusualLender: flags.filter((f) => f.category === "UNUSUAL_LENDER_ACTIVITY")
      .length,
    fraudulentListings: flags.filter((f) => f.category === "FRAUDULENT_LISTING")
      .length,
    loginAnomalies: flags.filter((f) => f.category === "LOGIN_ANOMALY").length,
  };
}
