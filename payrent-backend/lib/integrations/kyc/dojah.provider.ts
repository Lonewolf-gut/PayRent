import { AppError } from "@/lib/errors";
import { getDojahConfig, isDojahConfigured } from "@/lib/config/kyc";
import type {
  BankValidationInput,
  BankValidationOutcome,
  IdentityDocumentType,
  IdentityVerificationInput,
  IdentityVerificationOutcome,
  KycProvider,
} from "@/lib/integrations/kyc/types";

type DojahEntity = Record<string, unknown>;

function assertDojahConfigured() {
  if (!isDojahConfigured()) {
    throw new AppError(
      "Dojah KYC is enabled but DOJAH_APP_ID and DOJAH_SECRET_KEY are not configured.",
      503,
      "KYC_PROVIDER_MISCONFIGURED"
    );
  }
}

function buildReference(payload: unknown): string {
  return `dojah_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nameMatches(entity: DojahEntity, fullName: string): boolean {
  if (entity.is_full_name_match === true) return true;
  if (entity.is_first_name_match === true || entity.is_last_name_match === true) {
    return true;
  }

  const recordName = String(entity.full_name ?? "").trim().toLowerCase();
  const submittedName = fullName.trim().toLowerCase();
  if (!recordName || !submittedName) return false;
  return recordName === submittedName;
}

function dobMatches(entity: DojahEntity): boolean {
  if (entity.is_date_of_birth_match === true) return true;
  return false;
}

async function dojahGet(path: string, params: Record<string, string>) {
  assertDojahConfigured();
  const { appId, secretKey, baseUrl } = getDojahConfig();
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      AppId: appId,
      Authorization: secretKey,
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (typeof body.error === "string" && body.error) ||
      (typeof body.message === "string" && body.message) ||
      `Dojah request failed (${response.status})`;
    throw new AppError(message, 502, "KYC_PROVIDER_ERROR");
  }

  return body;
}

function endpointForDocument(documentType: IdentityDocumentType): {
  path: string;
  buildParams: (input: IdentityVerificationInput) => Record<string, string>;
} {
  switch (documentType) {
    case "VOTER_ID":
      return {
        path: "/api/v1/gh/kyc/voter",
        buildParams: (input) => ({
          id: input.idNumber,
          full_name: input.fullName,
        }),
      };
    case "PASSPORT":
      return {
        path: "/api/v1/gh/kyc/passport",
        buildParams: (input) => ({
          id: input.idNumber,
        }),
      };
    case "DRIVERS_LICENSE":
      return {
        path: "/api/v1/gh/kyc/dl",
        buildParams: (input) => ({
          id: input.idNumber,
          full_name: input.fullName,
          date_of_birth: input.dateOfBirth ?? "",
        }),
      };
    case "GHANA_CARD":
    default:
      return {
        path: "/api/v1/gh/kyc/passport",
        buildParams: (input) => ({
          id: input.idNumber,
        }),
      };
  }
}

export const dojahKycProvider: KycProvider = {
  name: "dojah",

  async verifyIdentity(
    input: IdentityVerificationInput
  ): Promise<IdentityVerificationOutcome> {
    if (input.documentType === "DRIVERS_LICENSE" && !input.dateOfBirth) {
      return {
        status: "FAILED",
        failureReason: "Date of birth is required for driver's licence verification.",
        requiresManualReview: true,
      };
    }

    const { path, buildParams } = endpointForDocument(input.documentType);
    const params = buildParams(input);
    if (input.documentType === "DRIVERS_LICENSE" && !params.date_of_birth) {
      return {
        status: "FAILED",
        failureReason: "Date of birth is required for driver's licence verification.",
        requiresManualReview: true,
      };
    }

    try {
      const payload = await dojahGet(path, params);
      const entity = (payload.entity ?? payload.data ?? payload) as DojahEntity;
      const providerReference = buildReference(payload);

      if (!entity || typeof entity !== "object" || Object.keys(entity).length === 0) {
        return {
          status: "FAILED",
          failureReason: "No matching identity record was returned by Dojah.",
          providerReference,
          requiresManualReview: true,
          rawResponseReference: providerReference,
        };
      }

      const nameOk = nameMatches(entity, input.fullName);
      const dobOk = input.dateOfBirth ? dobMatches(entity) : true;

      if (nameOk && dobOk) {
        return {
          status: "VERIFIED",
          providerReference,
          verifiedAt: new Date(),
          matchDetails: {
            documentType: input.documentType,
            isFullNameMatch: entity.is_full_name_match ?? nameOk,
            isDateOfBirthMatch: entity.is_date_of_birth_match ?? dobOk,
          },
          rawResponseReference: providerReference,
        };
      }

      return {
        status: "PENDING",
        providerReference,
        reason: "Identity details did not fully match the provider record.",
        requiresManualReview: true,
        rawResponseReference: providerReference,
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          status: "PENDING",
          reason: error.message,
          requiresManualReview: true,
        };
      }

      return {
        status: "PENDING",
        reason: "Unable to complete automated identity verification.",
        requiresManualReview: true,
      };
    }
  },

  async validateBankAccount(
    _input: BankValidationInput
  ): Promise<BankValidationOutcome> {
    return {
      status: "PENDING",
      reason: "Automated bank validation is not enabled yet. An administrator will review this account.",
      requiresManualReview: true,
    };
  },
};
