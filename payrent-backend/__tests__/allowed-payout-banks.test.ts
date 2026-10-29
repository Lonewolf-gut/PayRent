import { describe, expect, it } from "vitest";
import {
  assertAllowedPayoutBank,
  filterAllowedPaystackBanks,
  findAllowedPayoutBankProvider,
  isAllowedPayoutBankCode,
  isAllowedPayoutBankName,
  isCbgBankAccount,
  mapAllPaystackBanksToProviders,
  mergePayoutBankProviders,
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

  it("maps all Paystack GHIPSS banks for buyer account lookup", () => {
    const all = mapAllPaystackBanksToProviders(paystackBanks);
    expect(all.some((b) => b.code === "130")).toBe(true);
    expect(all.some((b) => b.code === "340")).toBe(true);
  });

  it("detects CBG accounts for automated mandate routing", () => {
    expect(isCbgBankAccount("340", "Consolidated Bank Ghana Limited")).toBe(true);
    expect(isCbgBankAccount("130", "Ecobank Ghana Limited")).toBe(false);
  });

  it("accepts allowed bank names and codes", () => {
    const providers = mapAllPaystackBanksToProviders(paystackBanks);
    expect(isAllowedPayoutBankName("GCB Bank Limited")).toBe(true);
    expect(isAllowedPayoutBankCode("040", providers)).toBe(true);
    expect(isAllowedPayoutBankCode("130", providers)).toBe(true);
    expect(findAllowedPayoutBankProvider("040", providers)?.resolveCode).toBe("040");
    expect(() =>
      assertAllowedPayoutBank({
        accountType: "BANK",
        bankCode: "130",
        bankName: "Ecobank Ghana Limited",
        providers,
      })
    ).not.toThrow();
  });

  it("rejects banks not in the provider list", () => {
    const providers = filterAllowedPaystackBanks(paystackBanks);
    expect(() =>
      assertAllowedPayoutBank({
        accountType: "BANK",
        bankCode: "999",
        bankName: "Unknown Bank",
        providers,
      })
    ).toThrow(/Select a bank from the supported list/);
  });

  it("merges admin banks without duplicating defaults", () => {
    expect(
      mergePayoutBankProviders(
        [{ code: "040", name: "GCB Bank", resolveCode: "040" }],
        [
          { code: "040", name: "GCB Bank", resolveCode: "040" },
          { code: "130", name: "Ecobank Ghana", resolveCode: "130" },
        ]
      )
    ).toEqual([
      { code: "040", name: "GCB Bank", resolveCode: "040" },
      { code: "130", name: "Ecobank Ghana", resolveCode: "130" },
    ]);
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
