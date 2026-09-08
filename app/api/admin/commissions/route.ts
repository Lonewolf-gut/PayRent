import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req) => {
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = 30;
    const skip = (page - 1) * limit;

    const [records, total, aggregate] = await Promise.all([
      prisma.commission.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          transaction: {
            select: {
              reference: true,
              type: true,
              amount: true,
              wallet: {
                select: {
                  user: { select: { email: true, role: true } },
                },
              },
            },
          },
        },
      }),
      prisma.commission.count(),
      prisma.commission.aggregate({
        _sum: {
          serviceFee: true,
          commissionFee: true,
          processingFee: true,
          totalFee: true,
        },
      }),
    ]);

    return apiResponse({
      records,
      total,
      page,
      limit,
      totals: aggregate._sum,
    });
  },
  { roles: ["ADMIN"], permission: "admin:commissions" }
);
