export type MandatePreviewStatus =
  | "awaiting_lender"
  | "awaiting_buyer"
  | "mandate_pending"
  | "bank_processing"
  | "active"
  | "declined"
  | "none";

export type MandatePreviewData = {
  financingRequestId: string;
  mandateId?: string | null;
  propertyName: string;
  borrowerName: string;
  lenderName?: string | null;
  bankName?: string | null;
  accountNumberMasked?: string | null;
  accountName?: string | null;
  bankAccountId?: string | null;
  principalAmount: number;
  interestRate?: number | null;
  durationMonths: number;
  totalRepayable?: number | null;
  monthlyPayment?: number | null;
  financingStatus: string;
  mandateStatus?: string | null;
  mandateSource?: string | null;
  documentUrl?: string | null;
  previewStatus: MandatePreviewStatus;
  buyerAcceptedAt?: string | null;
  lenderAcceptedAt?: string | null;
  ratePricingVisible: boolean;
  buyerIdentityDocumentLabel?: string | null;
  buyerIdentityDocumentNumber?: string | null;
  lenderIdentityDocumentLabel?: string | null;
  lenderIdentityDocumentNumber?: string | null;
};

type FinancingLike = {
  id: string;
  status: string;
  requestedAmount: number | string | { toString(): string };
  approvedAmount?: number | string | { toString(): string } | null;
  offeredInterestRate?: number | string | { toString(): string } | null;
  approvedAt?: Date | string | null;
  durationMonths: number;
  buyerAcceptedAt?: Date | string | null;
  lenderName?: string | null;
  property?: { name?: string | null } | null;
  tenant?: {
    fullName?: string | null;
    user?: { email?: string | null } | null;
  } | null;
  feeDisclosure?: {
    principalAmount?: number | string | { toString(): string } | null;
    interestRate?: number | string | { toString(): string } | null;
    totalRepayable?: number | string | { toString(): string } | null;
    monthlyPayment?: number | string | { toString(): string } | null;
    acceptedAt?: Date | string | null;
  } | null;
  mandate?: {
    id: string;
    status: string;
    mandateSource: string;
    documentUrl?: string | null;
    bankAccount?: {
      bankName?: string | null;
      accountNumberMasked?: string | null;
      accountName?: string | null;
    } | null;
  } | null;
  repaymentBankAccount?: {
    id?: string;
    bankName?: string | null;
    accountNumberMasked?: string | null;
    accountName?: string | null;
  } | null;
  repaymentPreference?: {
    bankAccountId?: string;
  } | null;
  buyerIdentityDocumentLabel?: string | null;
  buyerIdentityDocumentNumber?: string | null;
  lenderIdentityDocumentLabel?: string | null;
  lenderIdentityDocumentNumber?: string | null;
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function hasKnownFinancingRate(financing: FinancingLike) {
  return (
    toNumber(financing.offeredInterestRate) != null ||
    toNumber(financing.feeDisclosure?.interestRate) != null
  );
}

export function resolveMonthlyPayment(
  preview: Pick<
    MandatePreviewData,
    "monthlyPayment" | "totalRepayable" | "principalAmount" | "interestRate" | "durationMonths"
  >
): number | null {
  if (preview.monthlyPayment != null && Number.isFinite(preview.monthlyPayment)) {
    return preview.monthlyPayment;
  }

  const totalRepayable =
    preview.totalRepayable ??
    (preview.interestRate != null && preview.principalAmount > 0
      ? preview.principalAmount * (1 + preview.interestRate / 100)
      : null);

  if (totalRepayable != null && preview.durationMonths > 0) {
    return totalRepayable / preview.durationMonths;
  }

  return null;
}

export function buildMandatePreview(financing: FinancingLike): MandatePreviewData {
  const principalAmount =
    toNumber(financing.approvedAmount) ??
    toNumber(financing.feeDisclosure?.principalAmount) ??
    toNumber(financing.requestedAmount) ??
    0;
  const interestRate =
    toNumber(financing.offeredInterestRate) ?? toNumber(financing.feeDisclosure?.interestRate);
  const ratePricingVisible = hasKnownFinancingRate(financing);
  const totalRepayable = ratePricingVisible
    ? toNumber(financing.feeDisclosure?.totalRepayable) ??
      (interestRate != null && principalAmount > 0
        ? principalAmount * (1 + interestRate / 100)
        : null)
    : null;
  const monthlyPayment = ratePricingVisible
    ? resolveMonthlyPayment({
        monthlyPayment: toNumber(financing.feeDisclosure?.monthlyPayment),
        totalRepayable,
        principalAmount,
        interestRate,
        durationMonths: financing.durationMonths,
      })
    : null;

  let previewStatus: MandatePreviewStatus = "awaiting_lender";
  if (financing.status === "REJECTED" || financing.status === "WITHDRAWN") {
    previewStatus = "declined";
  } else if (financing.status === "APPROVED" && !financing.buyerAcceptedAt) {
    previewStatus = "awaiting_buyer";
  } else if (financing.mandate) {
    if (financing.mandate.status === "ACTIVE") previewStatus = "active";
    else if (
      ["BANK_PROCESSING", "ADMIN_REVIEW", "PENDING_MANUAL_RESOLUTION"].includes(
        financing.mandate.status
      )
    ) {
      previewStatus = "bank_processing";
    } else if (financing.mandate.status === "DRAFT" && !ratePricingVisible) {
      previewStatus = "awaiting_lender";
    } else {
      previewStatus = "mandate_pending";
    }
  } else if (ratePricingVisible) {
    previewStatus = financing.buyerAcceptedAt ? "mandate_pending" : "awaiting_buyer";
  } else if (financing.buyerAcceptedAt) {
    previewStatus = "mandate_pending";
  }

  const borrowerName =
    financing.tenant?.fullName ?? financing.tenant?.user?.email ?? "Customer";

  const lenderAcceptedAt =
    financing.approvedAt ?? financing.feeDisclosure?.acceptedAt ?? null;

  return {
    financingRequestId: financing.id,
    mandateId: financing.mandate?.id ?? null,
    bankAccountId:
      financing.repaymentBankAccount?.id ?? financing.repaymentPreference?.bankAccountId ?? null,
    propertyName: financing.property?.name ?? "Listing",
    borrowerName,
    lenderName: financing.lenderName ?? null,
    bankName:
      financing.mandate?.bankAccount?.bankName ??
      financing.repaymentBankAccount?.bankName ??
      null,
    accountNumberMasked:
      financing.mandate?.bankAccount?.accountNumberMasked ??
      financing.repaymentBankAccount?.accountNumberMasked ??
      null,
    accountName:
      financing.mandate?.bankAccount?.accountName ??
      financing.repaymentBankAccount?.accountName ??
      null,
    principalAmount,
    interestRate,
    durationMonths: financing.durationMonths,
    totalRepayable,
    monthlyPayment,
    financingStatus: financing.status,
    mandateStatus: financing.mandate?.status ?? null,
    mandateSource: financing.mandate?.mandateSource ?? null,
    documentUrl: financing.mandate?.documentUrl ?? null,
    previewStatus,
    buyerAcceptedAt: financing.buyerAcceptedAt
      ? new Date(financing.buyerAcceptedAt).toISOString()
      : null,
    lenderAcceptedAt: lenderAcceptedAt ? new Date(lenderAcceptedAt).toISOString() : null,
    ratePricingVisible,
    buyerIdentityDocumentLabel: financing.buyerIdentityDocumentLabel ?? null,
    buyerIdentityDocumentNumber: financing.buyerIdentityDocumentNumber ?? null,
    lenderIdentityDocumentLabel: financing.lenderIdentityDocumentLabel ?? null,
    lenderIdentityDocumentNumber: financing.lenderIdentityDocumentNumber ?? null,
  };
}
