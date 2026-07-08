import { prisma } from "@/lib/db/prisma";
import { countFailedLoginsLast24h } from "@/lib/admin/failed-login-stats";
import { kycService } from "@/lib/services/kyc.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [pendingKyc, failedLogins24h, auditLogs24h] = await Promise.all([
      kycService.getPendingKycReviews().then((rows) => rows.length),
      countFailedLoginsLast24h(),
      prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
    ]);

    return apiResponse({ pendingKyc, failedLogins24h, auditLogs24h });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:monitor" }
);
