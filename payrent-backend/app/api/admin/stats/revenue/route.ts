import { NextRequest } from "next/server";
import { analyticsService } from "@/lib/services/analytics.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

const ALLOWED_PERIODS = new Set([3, 6, 12]);

export const GET = withAuth(
  async (req: NextRequest) => {
    const raw = Number(req.nextUrl.searchParams.get("months") ?? 6);
    const months = ALLOWED_PERIODS.has(raw) ? raw : 6;
    const revenueTrend = await analyticsService.getRevenueTrend(months);
    return apiResponse(revenueTrend);
  },
  { roles: ["ADMIN"] }
);
