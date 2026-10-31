import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = 30;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          wallet: {
            select: {
              type: true,
              user: { select: { email: true, role: true } },
            },
          },
        },
      }),
      prisma.walletTransaction.count(),
    ]);

    return apiResponse({ transactions, total, page, limit });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:audit" }
);
