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
    const baseUrl = process.env.BANK_API_URL ?? "";
    const response = await fetch(`${baseUrl}/mandates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BANK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mandateId, bankAccountId, tenantUserId }),
    });

    if (!response.ok) {
      return {
        providerReference: `pending_${mandateId}`,
        status: "PENDING_MANUAL_RESOLUTION",
      };
    }

    const data = (await response.json()) as {
      reference?: string;
      status?: string;
      documentUrl?: string;
    };

    return {
      providerReference: data.reference ?? `man_${Date.now()}`,
      status:
        data.status === "ACTIVE"
          ? "ACTIVE"
          : data.status === "MANUAL"
            ? "PENDING_MANUAL_RESOLUTION"
            : "BANK_PROCESSING",
      documentUrl: data.documentUrl,
    };
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

export async function saveMandateDocument(file: File): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const { randomUUID } = await import("crypto");
  const extension = path.extname(file.name) || ".pdf";
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "mandates");
  await fs.mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
  return `/uploads/mandates/${fileName}`;
}
