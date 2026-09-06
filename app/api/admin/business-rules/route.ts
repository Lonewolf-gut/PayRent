import { NextRequest } from "next/server";
import { businessRulesService } from "@/lib/services/business-rules.service";
import { businessRulesPatchSchema } from "@/lib/business-rules/validation";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const rules = await businessRulesService.getRules();
    return apiResponse(rules);
  },
  { roles: ["ADMIN"], permission: "admin:fees" }
);

export const PATCH = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = businessRulesPatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    try {
      const rules = await businessRulesService.updateRules(
        parsed.data,
        session.user.id
      );
      return apiResponse(rules, 200, "Business rules updated.");
    } catch (error) {
      return apiResponse(
        { error: error instanceof Error ? error.message : "Update failed" },
        400
      );
    }
  },
  { roles: ["ADMIN"], permission: "admin:fees" }
);
