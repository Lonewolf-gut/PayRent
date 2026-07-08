import { NextRequest } from "next/server";
import type { ConsentType } from "@prisma/client";
import { consentService } from "@/lib/services/consent.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const consentType = req.nextUrl.searchParams.get("type") as ConsentType | null;
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);

    const result = await consentService.listForCompliance({
      consentType: consentType ?? undefined,
      page,
      limit,
    });

    return apiResponse(result);
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:audit" }
);
