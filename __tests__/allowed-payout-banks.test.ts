import { describe, expect, it } from "vitest";
import {
  assertAllowedPayoutBank,
  filterAllowedPaystackBanks,
  findAllowedPayoutBankProvider,
  isAllowedPayoutBankCode,
  isAllowedPayoutBankName,
} from "@/lib/constants/allowed-payout-banks";
import { filterPaystackMomoProviders } from "@/lib/integrations/paystack/banks";

describe("allowed payout banks", () => {
  const paystackBanks = [
    { code: "040", longcode: "040100", name: "GCB Bank Limited", slug: "gcb-bank-limited" },
    { code: "999", name: "GCB Savings and Loans", slug: "gcb-savings" },
    { code: "340", name: "Consolidated Bank Ghana Limited", slug: "cbg" },
    { code: "080", name: "Agricultural Development Bank", slug: "adb" },
    { code: "1201", name: "Zenith Bank (Ghana) Limited", slug: "zenith-bank-ghana" },
    { code: "130", name: "Ecobank Ghana Limited", slug: "ecobank" },
  ];

  it("filters Paystack banks to the four allowed partners", () => {
    expect(filterAllowedPaystackBanks(paystackBanks)).toEqual([
      {
        code: "040",
        name: "GCB Bank",
        resolveCode: "040",
        alternateResolveCodes: ["040100"],
      },
      {
        code: "340",
        name: "Consolidated Bank Ghana",
        resolveCode: "340",
        alternateResolveCodes: [],
      },
      {
        code: "080",
        name: "Agricultural Development Bank",
        resolveCode: "080",
        alternateResolveCodes: [],
      },
      {
        code: "1201",
        name: "Zenith Bank",
        resolveCode: "1201",
        alternateResolveCodes: [],
      },
    ]);
  });

  it("accepts allowed bank names and codes", () => {
    const providers = filterAllowedPaystackBanks(paystackBanks);
    expect(isAllowedPayoutBankName("GCB Bank Limited")).toBe(true);
    expect(isAllowedPayoutBankCode("040", providers)).toBe(true);
    expect(findAllowedPayoutBankProvider("040", providers)?.resolveCode).toBe("040");
    expect(() =>
      assertAllowedPayoutBank({
        accountType: "BANK",
        bankCode: "040",
        bankName: "GCB Bank",
        providers,
      })
    ).not.toThrow();
  });

  it("rejects unsupported banks", () => {
    const providers = filterAllowedPaystackBanks(paystackBanks);
    expect(() =>
      assertAllowedPayoutBank({
        accountType: "BANK",
        bankCode: "130",
        bankName: "Ecobank Ghana Limited",
        providers,
      })
    ).toThrow(/Only GCB Bank/);
  });

  it("does not restrict MoMo accounts", () => {
    expect(() =>
      assertAllowedPayoutBank({
        accountType: "MOMO",
        bankCode: "MTN",
        bankName: "MTN Mobile Money",
      })
    ).not.toThrow();
  });
});

describe("momo providers", () => {
  it("maps Paystack mobile money providers to the Ghana networks", () => {
    expect(
      filterPaystackMomoProviders([
        { code: "MTN", name: "MTN Mobile Money" },
        { code: "VOD", name: "Vodafone Cash" },
        { code: "ATL", name: "AirtelTigo Money" },
      ])
    ).toEqual([
      { code: "MTN", name: "MTN Mobile Money" },
      { code: "VOD", name: "Telecel Cash (Vodafone)" },
      { code: "ATL", name: "AirtelTigo Money" },
    ]);
  });
});
