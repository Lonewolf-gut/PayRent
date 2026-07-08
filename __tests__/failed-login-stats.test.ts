import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  loginLog: { count: vi.fn() },
  user: { findMany: vi.fn() },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("countFailedLoginsLast24h", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns login log count when available", async () => {
    prismaMock.loginLog.count.mockResolvedValueOnce(2);
    const { countFailedLoginsLast24h } = await import("@/lib/admin/failed-login-stats");

    await expect(countFailedLoginsLast24h()).resolves.toBe(2);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it("falls back to recent user failedLoginCount totals when logs are empty", async () => {
    prismaMock.loginLog.count.mockResolvedValueOnce(0);
    prismaMock.user.findMany.mockResolvedValueOnce([
      { failedLoginCount: 2 },
      { failedLoginCount: 1 },
    ]);
    const { countFailedLoginsLast24h } = await import("@/lib/admin/failed-login-stats");

    await expect(countFailedLoginsLast24h()).resolves.toBe(3);
  });
});
