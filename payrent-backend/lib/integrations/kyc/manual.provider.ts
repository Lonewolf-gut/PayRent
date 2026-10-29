import type {
  BankValidationInput,
  BankValidationOutcome,
  IdentityVerificationInput,
  IdentityVerificationOutcome,
  KycProvider,
} from "@/lib/integrations/kyc/types";

export const manualKycProvider: KycProvider = {
  name: "manual",

  async verifyIdentity(
    input: IdentityVerificationInput
  ): Promise<IdentityVerificationOutcome> {
    return {
      status: "PENDING",
      reason: `${input.documentType} submitted for administrator review.`,
      requiresManualReview: true,
    };
  },

  async validateBankAccount(
    _input: BankValidationInput
  ): Promise<BankValidationOutcome> {
    return {
      status: "PENDING",
      reason: "Bank account submitted for administrator validation.",
      requiresManualReview: true,
    };
  },
};
