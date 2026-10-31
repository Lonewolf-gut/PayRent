export type KycProviderName = "manual" | "dojah";

export type IdentityDocumentType =
  | "GHANA_CARD"
  | "VOTER_ID"
  | "PASSPORT"
  | "DRIVERS_LICENSE";

export type ClientVerificationStatus = "VERIFIED" | "PENDING" | "FAILED";

export interface IdentityVerificationInput {
  documentType: IdentityDocumentType;
  idNumber: string;
  fullName: string;
  dateOfBirth?: string;
}

export type IdentityVerificationOutcome =
  | {
      status: "VERIFIED";
      providerReference: string;
      verifiedAt: Date;
      matchDetails?: Record<string, unknown>;
      rawResponseReference?: string;
    }
  | {
      status: "PENDING";
      providerReference?: string;
      reason: string;
      requiresManualReview: true;
      rawResponseReference?: string;
    }
  | {
      status: "FAILED";
      failureReason: string;
      providerReference?: string;
      requiresManualReview?: boolean;
      rawResponseReference?: string;
    };

export interface BankValidationInput {
  accountType: "BANK" | "MOMO";
  bankCode?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export type BankValidationOutcome =
  | {
      status: "VALIDATED";
      providerReference?: string;
    }
  | {
      status: "PENDING";
      reason: string;
      requiresManualReview: true;
    }
  | {
      status: "FAILED";
      failureReason: string;
      requiresManualReview?: boolean;
    };

export interface KycProvider {
  readonly name: KycProviderName;
  verifyIdentity(input: IdentityVerificationInput): Promise<IdentityVerificationOutcome>;
  validateBankAccount(input: BankValidationInput): Promise<BankValidationOutcome>;
}

export interface IdentityVerificationResult {
  verificationId: string;
  verificationStatus: ClientVerificationStatus;
  providerName: KycProviderName;
  providerReference?: string | null;
  verifiedAt?: string | null;
  failureReason?: string | null;
  requiresManualReview?: boolean;
}

export function toClientVerificationStatus(
  status: "APPROVED" | "PENDING" | "REJECTED"
): ClientVerificationStatus {
  if (status === "APPROVED") return "VERIFIED";
  if (status === "REJECTED") return "FAILED";
  return "PENDING";
}
