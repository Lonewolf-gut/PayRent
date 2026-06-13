import { prisma } from "@/lib/db/prisma";
import { analyticsService } from "@/lib/services/analytics.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const [
      users,
      properties,
      transactions,
      pendingProperties,
      pendingFinancing,
      ceoData,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count({ where: { status: "ACTIVE" } }),
      prisma.walletTransaction.count({ where: { status: "COMPLETED" } }),
      prisma.property.count({ where: { status: "PENDING_VERIFICATION" } }),
      prisma.financingRequest.count({ where: { status: "PENDING" } }),
      analyticsService.getCeoDashboard(),
    ]);

    const failedLogins = await prisma.loginLog.count({
      where: { success: false, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });

    return apiResponse({
      users,
      properties,
      transactions,
      pendingProperties,
      pendingFinancing,
      failedLogins,
      revenue: ceoData.overview,
    });
  },
  { roles: ["ADMIN"] }
);
