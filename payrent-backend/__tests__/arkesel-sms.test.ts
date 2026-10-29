import { describe, expect, it } from "vitest";
import { isArkeselConfigured } from "@/lib/integrations/sms/arkesel";

describe("isArkeselConfigured", () => {
  it("returns false when API key or sender ID is missing", () => {
    expect(isArkeselConfigured()).toBe(false);
  });
});
