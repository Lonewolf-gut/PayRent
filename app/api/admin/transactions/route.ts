import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req) => {
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = 30;
    const skip = (page - 1) * limit;

    const [transactions, total, commissionSum] = await Promise.all([
      prisma.walletTransaction.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          wallet: {
            select: {
              type: true,
              user: { select: { email: true, role: true } },
            },
          },
          commissionRecord: true,
        },
      }),
      prisma.walletTransaction.count(),
      prisma.commission.aggregate({ _sum: { totalFee: true } }),
    ]);

    const auditLogs = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });

    return apiResponse({
      transactions,
      total,
      totalCommission: commissionSum._sum.totalFee ?? 0,
      auditLogs,
      page,
      limit,
    });
  },
  { roles: ["ADMIN", "CEO"], permission: "admin:transactions" }
);
