import { NextRequest } from "next/server";
import { z } from "zod";
import { financingService } from "@/lib/services/financing.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });
    if (!tenant) return apiResponse([]);

    const requests = await prisma.financingRequest.findMany({
      where: { tenantId: tenant.id, status: "FUNDED" },
      include: {
        property: { select: { name: true } },
        repaymentPlan: {
          include: {
            installments: { orderBy: { dueDate: "asc" } },
          },
        },
      },
    });

    const installments = requests.flatMap((r) =>
      (r.repaymentPlan?.installments ?? []).map((inst) => ({
        ...inst,
        propertyName: r.property.name,
        financingRequestId: r.id,
      }))
    );

    return apiResponse(installments);
  },
  { roles: ["TENANT"] }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const { installmentId } = z
      .object({ installmentId: z.string().cuid() })
      .parse(await req.json());

    const result = await financingService.payInstallment(
      session.user.id,
      installmentId
    );
    return apiResponse(result);
  },
  { roles: ["TENANT"], permission: "wallet:pay" }
);
