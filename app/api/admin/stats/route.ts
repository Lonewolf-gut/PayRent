import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const GET = withAuth(
  async () => {
    const [
      users,
      properties,
      transactions,
      pendingProperties,
      pendingFinancing,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count({ where: { status: "ACTIVE" } }),
      prisma.walletTransaction.count({ where: { status: "COMPLETED" } }),
      prisma.property.count({ where: { status: "PENDING_VERIFICATION" } }),
      prisma.financingRequest.count({ where: { status: "PENDING" } }),
      prisma.walletTransaction.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: startOfCurrentMonth() },
        },
        _sum: { amount: true },
      }),
    ]);

    return apiResponse({
      users,
      properties,
      transactions,
      pendingProperties,
      pendingFinancing,
      revenue: {
        monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
      },
    });
  },
  { roles: ["ADMIN"] }
);
