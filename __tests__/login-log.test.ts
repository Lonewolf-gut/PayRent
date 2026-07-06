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

    await logLoginAttempt("user-1", true);

    expect(auditService.logLogin).toHaveBeenCalledWith(
      "user-1",
      true,
      "203.0.113.10",
      "Mozilla/5.0 Test Browser"
    );
  });

  it("records failed logins without throwing when audit logging fails", async () => {
    vi.mocked(auditService.logLogin).mockRejectedValueOnce(new Error("db down"));
    const { logLoginAttempt } = await import("@/lib/auth/login-log");

    await expect(logLoginAttempt("user-2", false)).resolves.toBeUndefined();
  });
});
