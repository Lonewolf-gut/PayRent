import { prisma } from "@/lib/db/prisma";
import { analyticsService } from "@/lib/services/analytics.service";
import { countFailedLoginsLast24h } from "@/lib/admin/failed-login-stats";
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

    const failedLogins = await countFailedLoginsLast24h();

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
