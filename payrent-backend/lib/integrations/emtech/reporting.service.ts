import { prisma } from "@/lib/db/prisma";
import { getEmtechConfig, isEmtechConfigured } from "@/lib/integrations/emtech/config";
import { postEmtechConsumerComplaint, postEmtechTransaction } from "@/lib/integrations/emtech/client";
import type {
  EmtechAccountType,
  EmtechConsumerComplaintPayload,
  EmtechKycLevel,
  EmtechKycStatus,
  EmtechKycType,
  EmtechTransactionPayload,
  EmtechTransactionStatus,
  EmtechTransactionType,
} from "@/lib/integrations/emtech/types";
import { logger } from "@/lib/logger";
import type { WalletTransaction } from "@prisma/client";

const DEFAULT_CITY = "Accra";
const DEFAULT_COUNTRY = "GH";
const DEFAULT_REGION = "GH-AA";

type OriginKyc = {
  status: EmtechKycStatus;
  type: EmtechKycType;
  service: string;
  level: EmtechKycLevel;
  typeDetails?: string;
};

async function loadOriginKyc(userId: string): Promise<OriginKyc> {
  const verification = await prisma.verification.findFirst({
    where: { userId, type: "IDENTITY", status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });

  const data = verification?.data as
    | { documentType?: string; idNumber?: string; provider?: string }
    | undefined;

  return {
    status: verification ? "VERIFIED" : "NOTCHECKED",
    type: "NATIONAL_ID_TEXT",
    service: process.env.KYC_PROVIDER === "dojah" ? "Dojah" : "PayForMe",
    level: verification ? "ENHANCED" : "MINIMUM",
    typeDetails: data?.documentType ?? "GHANA_CARD",
  };
}

function mapProviderAccountType(provider?: string | null): EmtechAccountType {
  const normalized = (provider ?? "").toLowerCase();
  if (normalized.includes("momo") || normalized.includes("mobile")) {
    return "MOBILE_MONEY";
  }
  if (normalized.includes("bank")) {
    return "BANK";
  }
  return "BANK";
}

function mapWalletTransactionType(type: WalletTransaction["type"]): EmtechTransactionType {
  switch (type) {
    case "DEPOSIT":
      return "DEPOSIT";
    case "WITHDRAWAL":
      return "WITHDRAWAL";
    default:
      return "PAYMENT";
  }
}

function mapWalletTransactionStatus(status: WalletTransaction["status"]): EmtechTransactionStatus {
  switch (status) {
    case "COMPLETED":
      return "SUCCESS";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
      return "REJECT";
    default:
      return "OTHER";
  }
}

function buildBasePayload(params: {
  transactionId: string;
  transactionType: EmtechTransactionType;
  transactionStatus: EmtechTransactionStatus;
  transactionDatetime: Date;
  originUserId: string;
  originAmount: number;
  originAccountId: string;
  originAccountType: EmtechAccountType;
  originAccountProvider?: string;
  destinationAccountId: string;
  destinationAccountType: EmtechAccountType;
  destinationAmount: number;
  destinationAccountProvider?: string;
  feeAmount?: number;
  gatewayTransactionId?: string;
  gatewayTransactionProvider?: string;
  transactionReason?: string;
  originKyc: OriginKyc;
  meta?: Record<string, unknown>;
}): EmtechTransactionPayload {
  const config = getEmtechConfig();
  const feeAmount = params.feeAmount ?? 0;

  return {
    transactionId: params.transactionId,
    transactionType: params.transactionType,
    transactionStatus: params.transactionStatus,
    transactionDatetime: params.transactionDatetime.toISOString(),
    transactionChannel: config.transactionChannel,
    transactionDeviceId: config.deviceId,
    originUserId: params.originUserId,
    originAmount: params.originAmount,
    originCurrency: "GHS",
    originCurrencyType: "FIAT",
    originAccountID: params.originAccountId,
    originAccountType: params.originAccountType,
    originAccountCity: DEFAULT_CITY,
    originAccountRegion: DEFAULT_REGION,
    originAccountCountry: DEFAULT_COUNTRY,
    originAccountProvider: params.originAccountProvider,
    originUserKYCStatus: params.originKyc.status,
    originUserKYCType: params.originKyc.type,
    originUserKYCService: params.originKyc.service,
    originUserKYCLevel: params.originKyc.level,
    originUserKYCTypeDetails: params.originKyc.typeDetails,
    destinationAmount: params.destinationAmount,
    destinationCurrency: "GHS",
    destinationCurrencyType: "FIAT",
    destinationAccountId: params.destinationAccountId,
    destinationAccountType: params.destinationAccountType,
    destinationAccountCity: DEFAULT_CITY,
    destinationAccountRegion: DEFAULT_REGION,
    destinationAccountCountry: DEFAULT_COUNTRY,
    destinationAccountProvider: params.destinationAccountProvider,
    transactionFeeAmount: feeAmount,
    transactionFeeCurrency: "GHS",
    transactionFeeCurrencyType: "FIAT",
    gatewayTransactionId: params.gatewayTransactionId,
    gatewayTransactionProvider: params.gatewayTransactionProvider,
    transactionReason: params.transactionReason,
    meta: params.meta,
  };
}

export async function reportWalletTransaction(params: {
  userId: string;
  transaction: Pick<
    WalletTransaction,
    "id" | "type" | "status" | "amount" | "fee" | "netAmount" | "reference" | "createdAt"
  >;
  provider?: string;
  accountType?: EmtechAccountType;
  accountId?: string;
  destinationAccountId?: string;
  destinationAccountType?: EmtechAccountType;
  gatewayTransactionId?: string;
}) {
  if (!isEmtechConfigured()) return;

  const originKyc = await loadOriginKyc(params.userId);
  const accountType = params.accountType ?? mapProviderAccountType(params.provider);
  const destinationType = params.destinationAccountType ?? "BANK";

  const payload = buildBasePayload({
    transactionId: params.transaction.reference || params.transaction.id,
    transactionType: mapWalletTransactionType(params.transaction.type),
    transactionStatus: mapWalletTransactionStatus(params.transaction.status),
    transactionDatetime: params.transaction.createdAt,
    originUserId: params.userId,
    originAmount: Number(params.transaction.amount),
    originAccountId: params.accountId ?? `${params.userId}-wallet`,
    originAccountType: accountType,
    originAccountProvider: params.provider,
    destinationAccountId: params.destinationAccountId ?? "payforme-platform-treasury",
    destinationAccountType: destinationType,
    destinationAmount: Number(params.transaction.netAmount ?? params.transaction.amount),
    feeAmount: Number(params.transaction.fee ?? 0),
    gatewayTransactionId: params.gatewayTransactionId ?? params.transaction.reference,
    gatewayTransactionProvider: params.provider ?? "PayForMe",
    originKyc,
    meta: {
      walletTransactionId: params.transaction.id,
      source: "wallet",
    },
  });

  await postEmtechTransaction(payload);
}

export async function reportMandateDeduction(params: {
  userId: string;
  deductionEventId: string;
  mandateId: string;
  bankAccountId: string;
  bankName: string;
  amount: number;
  feeAmount?: number;
  status: "SUCCESS" | "FAILED" | "REJECT";
  providerReference?: string;
  failureReason?: string;
  occurredAt?: Date;
}) {
  if (!isEmtechConfigured()) return;

  const originKyc = await loadOriginKyc(params.userId);
  const payload = buildBasePayload({
    transactionId: params.providerReference ?? params.deductionEventId,
    transactionType: "PAYMENT",
    transactionStatus: params.status,
    transactionDatetime: params.occurredAt ?? new Date(),
    originUserId: params.userId,
    originAmount: params.amount,
    originAccountId: params.bankAccountId,
    originAccountType: "BANK",
    originAccountProvider: params.bankName,
    destinationAccountId: "payforme-lender-settlement",
    destinationAccountType: "BANK",
    destinationAmount: params.amount,
    destinationAccountProvider: "PayForMe",
    feeAmount: params.feeAmount ?? 0,
    gatewayTransactionId: params.providerReference,
    gatewayTransactionProvider: params.bankName,
    transactionReason: params.failureReason,
    originKyc,
    meta: {
      deductionEventId: params.deductionEventId,
      mandateId: params.mandateId,
      source: "mandate_deduction",
    },
  });

  await postEmtechTransaction(payload);
}

export async function reportConsumerComplaint(payload: EmtechConsumerComplaintPayload) {
  if (!isEmtechConfigured()) return;
  await postEmtechConsumerComplaint(payload);
}

export function scheduleEmtechReport(task: () => Promise<void>, context: Record<string, string>) {
  if (!isEmtechConfigured()) return;

  void task().catch((error) => {
    logger.warn("EMTECH regulatory report failed", {
      ...context,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  });
}
