import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 200);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.feeDisclosureRecord.findMany({
        skip,
        take: limit,
        orderBy: { acceptedAt: "desc" },
        include: {
          financingRequest: {
            select: {
              id: true,
              status: true,
              property: { select: { id: true, name: true } },
            },
          },
          tenantUser: { select: { id: true, email: true } },
          lenderUser: { select: { id: true, email: true } },
        },
      }),
      prisma.feeDisclosureRecord.count(),
    ]);

    return apiResponse({ items, total, page, limit });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:audit" }
);
