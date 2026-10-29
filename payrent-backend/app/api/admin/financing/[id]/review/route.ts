import { NextRequest } from "next/server";
import { z } from "zod";
import { financingService } from "@/lib/services/financing.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

const reviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  decisionNote: z.string().max(500).optional(),
});

export const POST = withAuth(
  async (req: NextRequest, ctx, session) => {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    const result = await financingService.adminReviewRequest(
      id,
      session.user.id,
      parsed.data.decision,
      parsed.data.decisionNote
    );

    return apiResponse(result);
  },
  { roles: ["ADMIN"], permission: "admin:transactions" }
);
