import { NextRequest } from "next/server";
import { approveFinancingSchema } from "@/lib/validations/financing";
import { financingService } from "@/lib/services/financing.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = approveFinancingSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    const lender = await prisma.lender.findUnique({
      where: { userId: session.user.id },
    });
    if (!lender) return apiResponse({ error: "Lender profile required" }, 403);

    const result = await financingService.approveRequest(
      lender.id,
      parsed.data
    );
    return apiResponse(result);
  },
  { roles: ["LENDER"], permission: "financing:approve" }
);
