export type MandateBankRegistrationResult = {
  providerReference: string;
  status: "BANK_PROCESSING" | "ACTIVE" | "PENDING_MANUAL_RESOLUTION";
  documentUrl?: string;
};

export interface MandateProvider {  readonly name: string;
  registerPlatformMandate(input: {
    mandateId: string;
    bankAccountId: string;
    tenantUserId: string;
  }): Promise<MandateBankRegistrationResult>;
  confirmMandateStatus(providerReference: string): Promise<
    "ACTIVE" | "BANK_PROCESSING" | "REJECTED" | "REVOKED" | "EXPIRED"
  >;
}

export function getMandateProvider(): MandateProvider {
  const useBankApi = Boolean(process.env.BANK_API_KEY?.trim());
  if (useBankApi) {
    return bankMandateProvider;
  }
  return sandboxMandateProvider;
}

const sandboxMandateProvider: MandateProvider = {
  name: "sandbox",

  async registerPlatformMandate({ mandateId }) {
    return {
      providerReference: `sandbox_man_${mandateId.slice(0, 8)}_${Date.now()}`,
      status: "BANK_PROCESSING",
      documentUrl: `/uploads/mandates/sample-mandate-form.pdf`,
    };
  },

  async confirmMandateStatus() {
    return "ACTIVE";
  },
};

const bankMandateProvider: MandateProvider = {
  name: "bank-api",

  async registerPlatformMandate({ mandateId, bankAccountId, tenantUserId }) {
    const { buildMandateRegistrationPayload, postBankMandateRegistration } = await import(
      "@/lib/integrations/mandate/bank-mandate.client"
    );
    const { prisma } = await import("@/lib/db/prisma");

    try {
      const payload = await buildMandateRegistrationPayload(
        mandateId,
        bankAccountId,
        tenantUserId
      );
      const data = await postBankMandateRegistration(payload);

      await prisma.bankPartnerTransaction.create({
        data: {
          direction: "OUTBOUND",
          type: "MANDATE",
          platformReference: `MND-${mandateId.slice(0, 8).toUpperCase()}`,
          partnerReference: data.reference ?? null,
          status: data.status === "ACTIVE" ? "COMPLETED" : "PROCESSING",
          mandateId,
          userId: tenantUserId,
          amount: payload.financing?.principalAmount ?? 0,
          metadata: {
            provider: "BANK_API",
            financingRequestId: payload.financing?.financingRequestId ?? null,
            customerNationalId: payload.customer.nationalId,
          },
        },
      });

      return {
        providerReference: data.reference ?? `man_${mandateId}`,
        status:
          data.status === "ACTIVE"
            ? "ACTIVE"
            : data.status === "MANUAL"
              ? "PENDING_MANUAL_RESOLUTION"
              : "BANK_PROCESSING",
        documentUrl: data.documentUrl,
      };
    } catch {
      return {
        providerReference: `pending_${mandateId}`,
        status: "PENDING_MANUAL_RESOLUTION",
      };
    }
  },

  async confirmMandateStatus(providerReference) {
    const baseUrl = process.env.BANK_API_URL ?? "";
    const response = await fetch(`${baseUrl}/mandates/${providerReference}`, {
      headers: { Authorization: `Bearer ${process.env.BANK_API_KEY}` },
    });
    if (!response.ok) return "BANK_PROCESSING";
    const data = (await response.json()) as { status?: string };
    const status = data.status?.toUpperCase();
    if (status === "ACTIVE") return "ACTIVE";
    if (status === "REJECTED") return "REJECTED";
    if (status === "REVOKED") return "REVOKED";
    if (status === "EXPIRED") return "EXPIRED";
    return "BANK_PROCESSING";
  },
};

import { saveMandateUpload } from "@/lib/integrations/documents";

export async function saveMandateDocument(file: File, ownerId: string): Promise<string> {
  return saveMandateUpload(file, ownerId);
}
