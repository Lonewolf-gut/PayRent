import { AppError } from "@/lib/errors";
import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import {
  normalizeGhanaPhoneNumber,
  resolvePaystackAccount,
} from "@/lib/integrations/paystack/banks";
import type { BankValidationInput, BankValidationOutcome } from "@/lib/integrations/kyc/types";

export async function validateBankAccountWithPaystack(
  input: BankValidationInput
): Promise<BankValidationOutcome & { resolvedAccountName?: string }> {
  if (!isPaystackConfigured()) {
    throw new AppError("Paystack is not configured for account verification.", 503);
  }

  if (!input.bankCode?.trim()) {
    throw new AppError("Select a bank or mobile money provider before saving.", 400);
  }

  const accountNumber =
    input.accountType === "MOMO"
      ? normalizeGhanaPhoneNumber(input.accountNumber)
      : input.accountNumber.trim();

  try {
    const resolved = await resolvePaystackAccount({
      accountNumber,
      bankCode: input.bankCode.trim(),
    });

    return {
      status: "VALIDATED",
      providerReference: resolved.accountNumber,
      resolvedAccountName: resolved.accountName,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error
        ? error.message
        : "Could not verify this account. Check the number and provider.",
      400
    );
  }
}
