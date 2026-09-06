import { NextRequest } from "next/server";
import { z } from "zod";
import { financingService } from "@/lib/services/financing.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const { financingRequestId } = z
      .object({ financingRequestId: z.string().cuid() })
      .parse(await req.json());

    const lender = await prisma.lender.findUnique({
      where: { userId: session.user.id },
    });
    if (!lender) return apiResponse({ error: "Lender required" }, 403);

    const result = await financingService.rejectRequest(
      financingRequestId,
      session.user.id
    );
    return apiResponse(result);
  },
  { roles: ["LENDER"], permission: "financing:reject" }
);
