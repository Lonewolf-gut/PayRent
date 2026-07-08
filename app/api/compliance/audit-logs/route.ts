import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10),
      500
    );

    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        userId: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return apiResponse({ logs });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:audit" }
);
