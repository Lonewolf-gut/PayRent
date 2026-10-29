import { NextRequest } from "next/server";
import { settlementService } from "@/lib/services/settlement.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const status = req.nextUrl.searchParams.get("status");
    const settlements = await settlementService.listForAdmin(
      status ? { status: status as "PENDING" | "COMPLETED" | "PROCESSING" | "FAILED" } : undefined
    );
    return apiResponse(settlements);
  },
  { roles: ["ADMIN"], permission: "admin:settlements" }
);

export const PATCH = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const { settlementId } = await req.json();
    if (!settlementId) {
      return apiResponse(null, 400, "Settlement ID required.");
    }

    const settlement = await settlementService.markCompleted(
      settlementId,
      session.user.id
    );
    return apiResponse(settlement, 200, "Settlement marked completed.");
  },
  { roles: ["ADMIN"], permission: "admin:settlements" }
);
