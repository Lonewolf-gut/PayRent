import { NextRequest } from "next/server";
import { financingRequestSchema } from "@/lib/validations/financing";
import { financingService } from "@/lib/services/financing.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest, _ctx, session) => {
    if (session.user.role === "LENDER") {
      const lender = await prisma.lender.findUnique({
        where: { userId: session.user.id },
      });
      if (!lender) return apiResponse([]);

      const scope = req.nextUrl.searchParams.get("scope");
      if (scope === "portfolio") {
        const portfolio = await financingService.getLenderPortfolio(lender.id);
        return apiResponse(portfolio);
      }

      const requests = await financingService.getPendingForLender();
      return apiResponse(requests);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });
    if (!tenant) return apiResponse([]);

    const requests = await prisma.financingRequest.findMany({
      where: { tenantId: tenant.id },
      include: { property: { include: { images: { take: 1 } } } },
      orderBy: { createdAt: "desc" },
    });
    return apiResponse(requests);
  },
  { roles: ["TENANT", "LENDER"] }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = financingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });
    if (!tenant) return apiResponse({ error: "Tenant profile required" }, 403);

    const request = await financingService.createRequest(
      tenant.id,
      parsed.data.propertyId,
      parsed.data.requestedAmount,
      parsed.data.durationMonths,
      parsed.data.notes,
      parsed.data.applicationId
    );

    return apiResponse(request, 201);
  },
  { roles: ["TENANT"], permission: "financing:create" }
);
