import { describe, expect, it } from "vitest";
import { formatPhoneForWigal, isWigalConfigured } from "@/lib/integrations/sms/wigal";

describe("isWigalConfigured", () => {
  it("returns false when credentials are missing", () => {
    expect(isWigalConfigured()).toBe(false);
  });
});

describe("formatPhoneForWigal", () => {
  it("converts E.164 Ghana numbers to local 0-prefix", () => {
    expect(formatPhoneForWigal("+233501234567")).toBe("0501234567");
    expect(formatPhoneForWigal("233501234567")).toBe("0501234567");
    expect(formatPhoneForWigal("0501234567")).toBe("0501234567");
  });
});
