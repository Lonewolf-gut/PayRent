import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  loginLog: {
    count: vi.fn(),
    create: vi.fn(),
  },
  user: { findMany: vi.fn() },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("countFailedLoginsLast24h", () => {
  beforeEach(() => {
    vi.resetModules();
    prismaMock.loginLog.count.mockReset();
    prismaMock.loginLog.create.mockReset();
    prismaMock.user.findMany.mockReset();
    prismaMock.loginLog.create.mockResolvedValue({ id: "log-1" });
  });

  it("returns login log count when available", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.loginLog.count.mockResolvedValue(2);

    const { countFailedLoginsLast24h } = await import("@/lib/admin/failed-login-stats");

    await expect(countFailedLoginsLast24h()).resolves.toBe(2);
  });

  it("backfills missing failed logs from user counters before counting", async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([
        {
          id: "user-1",
          email: "user@example.com",
          failedLoginCount: 2,
          updatedAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.loginLog.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    const { countFailedLoginsLast24h } = await import("@/lib/admin/failed-login-stats");

    await expect(countFailedLoginsLast24h()).resolves.toBe(2);
    expect(prismaMock.loginLog.create).toHaveBeenCalledTimes(2);
  });

  it("falls back to recent user failedLoginCount totals when logs are empty", async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ failedLoginCount: 2 }, { failedLoginCount: 1 }]);
    prismaMock.loginLog.count.mockResolvedValue(0);

    const { countFailedLoginsLast24h } = await import("@/lib/admin/failed-login-stats");

    await expect(countFailedLoginsLast24h()).resolves.toBe(3);
  });
});

describe("countAllFailedLogins", () => {
  beforeEach(() => {
    vi.resetModules();
    prismaMock.loginLog.count.mockReset();
    prismaMock.loginLog.create.mockReset();
    prismaMock.user.findMany.mockReset();
    prismaMock.loginLog.create.mockResolvedValue({ id: "log-1" });
  });

  it("returns total failed login log count", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.loginLog.count.mockResolvedValue(4);

    const { countAllFailedLogins } = await import("@/lib/admin/failed-login-stats");

    await expect(countAllFailedLogins()).resolves.toBe(4);
    expect(prismaMock.loginLog.count).toHaveBeenCalledWith({
      where: { success: false },
    });
  });

  it("falls back to sum of all user failedLoginCount when logs are empty", async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { failedLoginCount: 2 },
        { failedLoginCount: 2 },
      ]);
    prismaMock.loginLog.count.mockResolvedValue(0);

    const { countAllFailedLogins } = await import("@/lib/admin/failed-login-stats");

    await expect(countAllFailedLogins()).resolves.toBe(4);
  });
});
