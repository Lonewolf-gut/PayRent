import { NextRequest } from "next/server";
import { settlementService } from "@/lib/services/settlement.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (_req: NextRequest, _ctx, session) => {
    const settlements = await settlementService.listForUser(
      session.user.id,
      session.user.role
    );
    return apiResponse(settlements, 200, "Settlements retrieved.");
  },
  { roles: ["LANDLORD", "ADMIN"] }
);

export const PATCH = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const { settlementId } = body;
    if (!settlementId) return apiResponse(null, 400, "Settlement ID required.");

    const settlement = await settlementService.markCompleted(
      settlementId,
      session.user.id
    );
    return apiResponse(settlement, 200, "Settlement marked completed.");
  },
  { roles: ["ADMIN"], permission: "admin:settlements" }
);
