import { prisma } from "@/lib/db/prisma";
import { financingService } from "@/lib/services/financing.service";
import { buildMandatePreview } from "@/lib/utils/mandate-preview";
import {
  IDENTITY_DOCUMENT_LABELS,
  type IdentityDocumentType,
} from "@/lib/constants/identity-document-formats";
import type { IdentityDocumentType as KycIdentityDocumentType } from "@/lib/integrations/kyc/types";

export type {
  MandatePreviewData,
  MandatePreviewStatus,
} from "@/lib/utils/mandate-preview";

export { buildMandatePreview };

type RepaymentPreference = {
  bankAccountId?: string;
};

const ACTIVE_FINANCING_STATUSES = {
  notIn: ["REJECTED", "WITHDRAWN", "CLOSED", "COMPLETED"] as const,
};

type VerificationIdentityData = {
  documentType?: KycIdentityDocumentType | string;
  idNumber?: string;
};

function formatIdentityDocumentLabel(documentType?: string | null) {
  if (!documentType) return "ID document";
  if (documentType in IDENTITY_DOCUMENT_LABELS) {
    return IDENTITY_DOCUMENT_LABELS[documentType as IdentityDocumentType];
  }
  return documentType.replace(/_/g, " ");
}

export async function resolveBuyerIdentityDocuments(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUserIds.length) {
    return new Map<string, { label: string; number: string }>();
  }

  const [tenants, verifications] = await Promise.all([
    prisma.tenant.findMany({
      where: { userId: { in: uniqueUserIds } },
      select: { userId: true, nationalId: true },
    }),
    prisma.verification.findMany({
      where: {
        userId: { in: uniqueUserIds },
        type: "IDENTITY",
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: { userId: true, status: true, data: true },
    }),
  ]);

  const verificationByUser = new Map<string, (typeof verifications)[number]>();
  for (const verification of verifications) {
    const existing = verificationByUser.get(verification.userId);
    if (!existing) {
      verificationByUser.set(verification.userId, verification);
      continue;
    }
    if (existing.status !== "APPROVED" && verification.status === "APPROVED") {
      verificationByUser.set(verification.userId, verification);
    }
  }

  const tenantByUser = new Map(tenants.map((tenant) => [tenant.userId, tenant]));
  const identityByUser = new Map<string, { label: string; number: string }>();

  for (const userId of uniqueUserIds) {
    const tenant = tenantByUser.get(userId);
    const verification = verificationByUser.get(userId);
    const verificationData = verification?.data as VerificationIdentityData | null;
    const number = tenant?.nationalId ?? verificationData?.idNumber ?? null;
    if (!number) continue;

    identityByUser.set(userId, {
      label: formatIdentityDocumentLabel(verificationData?.documentType),
      number,
    });
  }

  return identityByUser;
}

export async function loadMandatePreviewsForTenant(
  tenantId: string,
  userId: string,
  options?: { syncDrafts?: boolean }
) {
  if (options?.syncDrafts !== false) {
    await financingService.syncAllMandateDraftsForTenant(tenantId, userId);
  }

  const requests = await prisma.financingRequest.findMany({
    where: {
      tenantId,
      status: ACTIVE_FINANCING_STATUSES,
    },
    include: {
      property: { select: { name: true } },
      feeDisclosure: true,
      mandate: {
        include: {
          bankAccount: {
            select: {
              bankName: true,
              accountNumberMasked: true,
              accountName: true,
            },
          },
        },
      },
      tenant: {
        include: {
          user: { select: { id: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const bankAccountIds = requests
    .map((request) => (request.repaymentPreference as RepaymentPreference | null)?.bankAccountId)
    .filter((id): id is string => Boolean(id));

  const bankAccounts = bankAccountIds.length
    ? await prisma.bankAccount.findMany({
        where: { id: { in: bankAccountIds }, userId },
        select: {
          id: true,
          bankName: true,
          accountNumberMasked: true,
          accountName: true,
        },
      })
    : [];

  const bankById = new Map(bankAccounts.map((account) => [account.id, account]));
  const identityByUser = await resolveBuyerIdentityDocuments(
    requests.map((request) => request.tenant.user.id)
  );

  const lenderUserIds = [
    ...new Set(
      requests
        .map((request) => request.feeDisclosure?.lenderUserId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const lenders = lenderUserIds.length
    ? await prisma.lender.findMany({
        where: { userId: { in: lenderUserIds } },
        select: { userId: true, fullName: true, institutionName: true },
      })
    : [];

  const lenderByUserId = new Map(lenders.map((lender) => [lender.userId, lender]));

  return requests.map((request) => {
    const bankAccountId = (request.repaymentPreference as RepaymentPreference | null)?.bankAccountId;
    const repaymentBankAccount = bankAccountId ? bankById.get(bankAccountId) ?? null : null;
    const identity = identityByUser.get(request.tenant.user.id);
    const lender = request.feeDisclosure?.lenderUserId
      ? lenderByUserId.get(request.feeDisclosure.lenderUserId)
      : null;
    const lenderName = lender
      ? lender.institutionName
        ? `${lender.fullName} (${lender.institutionName})`
        : lender.fullName
      : null;

    return buildMandatePreview({
      ...request,
      requestedAmount: Number(request.requestedAmount),
      approvedAmount: request.approvedAmount ? Number(request.approvedAmount) : null,
      offeredInterestRate: request.offeredInterestRate
        ? Number(request.offeredInterestRate)
        : null,
      lenderName,
      feeDisclosure: request.feeDisclosure
        ? {
            principalAmount: Number(request.feeDisclosure.principalAmount),
            interestRate: Number(request.feeDisclosure.interestRate),
            totalRepayable: Number(request.feeDisclosure.totalRepayable),
            monthlyPayment: Number(request.feeDisclosure.monthlyPayment),
            acceptedAt: request.feeDisclosure.acceptedAt,
          }
        : null,
      repaymentBankAccount,
      repaymentPreference: request.repaymentPreference as RepaymentPreference | null,
      buyerIdentityDocumentLabel: identity?.label ?? null,
      buyerIdentityDocumentNumber: identity?.number ?? null,
    });
  });
}
