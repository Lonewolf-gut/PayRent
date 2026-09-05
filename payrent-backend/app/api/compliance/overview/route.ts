import { prisma } from "@/lib/db/prisma";
import { countAllFailedLogins } from "@/lib/admin/failed-login-stats";
import { kycService } from "@/lib/services/kyc.service";
import { countSuspiciousActivityByCategory } from "@/lib/compliance/suspicious-activity.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const [
      pendingKyc,
      failedLogins,
      auditLogCount,
      consentCount,
      feeDisclosureCount,
      suspicious,
    ] = await Promise.all([
      kycService.countPendingKycReviews(),
      countAllFailedLogins(),
      prisma.auditLog.count(),
      prisma.dataConsent.count(),
      prisma.feeDisclosureRecord.count(),
      countSuspiciousActivityByCategory(),
    ]);

    return apiResponse({
      pendingKyc,
      failedLogins,
      auditLogCount,
      consentCount,
      feeDisclosureCount,
      suspicious,
    });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:monitor" }
);
