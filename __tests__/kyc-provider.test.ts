import { describe, expect, it } from "vitest";
import { manualKycProvider } from "@/lib/integrations/kyc/manual.provider";
import { toClientVerificationStatus } from "@/lib/integrations/kyc/types";
import { getKycProviderName } from "@/lib/config/kyc";

describe("manual KYC provider", () => {
  it("queues identity verification for administrator review", async () => {
    const result = await manualKycProvider.verifyIdentity({
      documentType: "GHANA_CARD",
      idNumber: "GHA-123456789-1",
      fullName: "Ama Mensah",
    });

    expect(result.status).toBe("PENDING");
    if (result.status === "PENDING") {
      expect(result.requiresManualReview).toBe(true);
    }
  });

  it("queues bank validation for administrator review", async () => {
    const result = await manualKycProvider.validateBankAccount({
      accountType: "BANK",
      bankName: "Example Bank",
      accountNumber: "0123456789",
      accountName: "Ama Mensah",
    });

    expect(result.status).toBe("PENDING");
    if (result.status === "PENDING") {
      expect(result.requiresManualReview).toBe(true);
    }
  });
});

describe("KYC status mapping", () => {
  it("maps approved records to verified client status", () => {
    expect(toClientVerificationStatus("APPROVED")).toBe("VERIFIED");
    expect(toClientVerificationStatus("PENDING")).toBe("PENDING");
    expect(toClientVerificationStatus("REJECTED")).toBe("FAILED");
  });
});

describe("KYC provider config", () => {
  it("defaults to manual provider", () => {
    const original = process.env.KYC_PROVIDER;
    delete process.env.KYC_PROVIDER;
    expect(getKycProviderName()).toBe("manual");
    process.env.KYC_PROVIDER = original;
  });
});
