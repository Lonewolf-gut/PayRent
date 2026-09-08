import { NextRequest } from "next/server";
import { disburseFinancingSchema } from "@/lib/validations/financing";
import { financingService } from "@/lib/services/financing.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = disburseFinancingSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    const result = await financingService.disburseByLender(
      session.user.id,
      parsed.data.financingRequestId
    );
    return apiResponse(result);
  },
  { roles: ["LENDER"], permission: "financing:approve" }
);
