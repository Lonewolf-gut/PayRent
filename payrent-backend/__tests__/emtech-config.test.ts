import { describe, expect, it, beforeEach } from "vitest";
import { getEmtechConfig, isEmtechConfigured } from "@/lib/integrations/emtech/config";
import { resetEmtechAuthCacheForTests } from "@/lib/integrations/emtech/client";

describe("emtech config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetEmtechAuthCacheForTests();
  });

  it("is disabled when credentials are missing", () => {
    delete process.env.EMTECH_CLIENT_ID;
    delete process.env.EMTECH_CLIENT_SECRET;
    delete process.env.EMTECH_ENABLED;

    expect(isEmtechConfigured()).toBe(false);
  });

  it("is enabled when credentials are present", () => {
    process.env.EMTECH_CLIENT_ID = "test-client";
    process.env.EMTECH_CLIENT_SECRET = "test-secret";

    expect(isEmtechConfigured()).toBe(true);
    expect(getEmtechConfig().baseUrl).toBe("https://api.emtech.com/integration");
  });

  it("respects EMTECH_ENABLED=false override", () => {
    process.env.EMTECH_CLIENT_ID = "test-client";
    process.env.EMTECH_CLIENT_SECRET = "test-secret";
    process.env.EMTECH_ENABLED = "false";

    expect(isEmtechConfigured()).toBe(false);
  });
});
