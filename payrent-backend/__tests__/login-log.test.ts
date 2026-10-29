import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditService } from "@/lib/services/audit.service";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(
    new Headers({
      "x-forwarded-for": "203.0.113.10, 70.41.3.18",
      "user-agent": "Mozilla/5.0 Test Browser",
    })
  ),
}));

vi.mock("@/lib/services/audit.service", () => ({
  auditService: {
    logLogin: vi.fn().mockResolvedValue({ id: "log-1" }),
  },
}));

describe("logLoginAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records successful logins with request metadata", async () => {
    const { logLoginAttempt } = await import("@/lib/auth/login-log");
    const request = new Request("http://localhost/api/auth/callback/credentials", {
      headers: {
        "x-forwarded-for": "198.51.100.4",
        "user-agent": "Mozilla/5.0 Auth Browser",
      },
    });

    await logLoginAttempt("user-1", true, undefined, request);

    expect(auditService.logLogin).toHaveBeenCalledWith(
      "user-1",
      true,
      "198.51.100.4",
      "Mozilla/5.0 Auth Browser",
      undefined
    );
  });

  it("falls back to next/headers when no request is provided", async () => {
    const { logLoginAttempt } = await import("@/lib/auth/login-log");

    await logLoginAttempt("user-1", true);

    expect(auditService.logLogin).toHaveBeenCalledWith(
      "user-1",
      true,
      "203.0.113.10",
      "Mozilla/5.0 Test Browser",
      undefined
    );
  });

  it("records failed logins without throwing when audit logging fails", async () => {
    vi.mocked(auditService.logLogin).mockRejectedValueOnce(new Error("db down"));
    const { logLoginAttempt } = await import("@/lib/auth/login-log");

    await expect(logLoginAttempt("user-2", false)).resolves.toBeUndefined();
  });

  it("still records failed logins when headers() is unavailable", async () => {
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockRejectedValueOnce(new Error("headers unavailable"));
    const { logLoginAttempt } = await import("@/lib/auth/login-log");

    await logLoginAttempt("user-3", false, "ghost@example.com");

    expect(auditService.logLogin).toHaveBeenCalledWith(
      "user-3",
      false,
      undefined,
      undefined,
      "ghost@example.com"
    );
  });
});
