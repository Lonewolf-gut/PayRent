import { describe, expect, it } from "vitest";
import { isBankPartnerApiConfigured } from "@/lib/services/payment/bank-partner-auth";

describe("bank partner auth", () => {
  it("reports disabled when BANK_API_KEY is unset", () => {
    const previous = process.env.BANK_API_KEY;
    delete process.env.BANK_API_KEY;
    expect(isBankPartnerApiConfigured()).toBe(false);
    process.env.BANK_API_KEY = previous;
  });
});
