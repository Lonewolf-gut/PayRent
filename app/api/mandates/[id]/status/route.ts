import { mandateService } from "@/lib/services/mandate.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (_req, ctx, session) => {
    const { id } = await ctx.params;

    if (session.user.role === "BUYER") {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: session.user.id },
      });
      if (!tenant) return apiResponse(null, 403, "Tenant profile required.");
      const mandate = await mandateService.syncBankStatus(id);
      if (!mandate || mandate.tenantId !== tenant.id) {
        return apiResponse(null, 404, "Mandate not found.");
      }
      return apiResponse(mandate, 200, "Mandate status updated.");
    }

    if (session.user.role === "ADMIN") {
      const mandate = await mandateService.syncBankStatus(id, session.user.id);
      return apiResponse(mandate, 200, "Mandate status updated.");
    }

    return apiResponse(null, 403, "Forbidden.");
  },
  { roles: ["BUYER", "ADMIN"] }
);
