import { prisma } from "@/lib/db/prisma";
import { countAllFailedLogins } from "@/lib/admin/failed-login-stats";
import { kycService } from "@/lib/services/kyc.service";
import { countSuspiciousActivityByCategory } from "@/lib/compliance/suspicious-activity.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      pendingKyc,
      failedLogins,
      auditLogs24h,
      consentCount,
      feeDisclosureCount,
      suspicious,
    ] = await Promise.all([
      kycService.getPendingKycReviews().then((rows) => rows.length),
      countAllFailedLogins(),
      prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
      prisma.dataConsent.count(),
      prisma.feeDisclosureRecord.count(),
      countSuspiciousActivityByCategory(),
    ]);

    return apiResponse({
      pendingKyc,
      failedLogins,
      auditLogs24h,
      consentCount,
      feeDisclosureCount,
      suspicious,
    });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:monitor" }
);
