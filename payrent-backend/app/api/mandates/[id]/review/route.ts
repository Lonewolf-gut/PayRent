import { NextRequest } from "next/server";
import { reviewMandateSchema } from "@/lib/validations/mandate";
import { mandateService } from "@/lib/services/mandate.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const POST = withAuth(
  async (req: NextRequest, ctx, session) => {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = reviewMandateSchema.safeParse(body);
    if (!parsed.success) return apiResponse(null, 400, "Validation failed.");

    const mandate = await mandateService.review(id, session.user.id, parsed.data);
    return apiResponse(mandate, 200, "Mandate reviewed.");
  },
  { roles: ["ADMIN"], permission: "admin:mandates" }
);
