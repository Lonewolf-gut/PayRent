import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { countFailedLoginsLast24h } from "@/lib/admin/failed-login-stats";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10),
      500
    );
    const skip = (page - 1) * limit;
    const success = req.nextUrl.searchParams.get("success");
    const userId = req.nextUrl.searchParams.get("userId");

    const where = {
      ...(success === "true" ? { success: true } : success === "false" ? { success: false } : {}),
      ...(userId ? { userId } : {}),
    };

    const [logs, total, lockedUsers] = await Promise.all([
      prisma.loginLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, role: true, isActive: true } },
        },
      }),
      prisma.loginLog.count({ where }),
      prisma.user.findMany({
        where: {
          OR: [
            { lockedUntil: { gt: new Date() } },
            { failedLoginCount: { gte: 5 } },
          ],
        },
        select: {
          id: true,
          email: true,
          role: true,
          failedLoginCount: true,
          lockedUntil: true,
          isActive: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
    ]);

    const failedLast24h = await countFailedLoginsLast24h();

    return apiResponse({ logs, total, page, limit, lockedUsers, failedLast24h });
  },
  { roles: ["ADMIN"], permission: "admin:fraud" }
);
