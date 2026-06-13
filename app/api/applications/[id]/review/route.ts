import { NextRequest } from "next/server";
import { reviewApplicationSchema } from "@/lib/validations/application";
import { applicationService } from "@/lib/services/application.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const POST = withAuth(
  async (req: NextRequest, ctx, session) => {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = reviewApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse(null, 400, "Validation failed.");
    }

    const application = await applicationService.review(
      id,
      session.user.id,
      parsed.data
    );

    return apiResponse(application, 200, "Application reviewed.");
  },
  { roles: ["LANDLORD", "AGENT"], permission: "application:review" }
);
