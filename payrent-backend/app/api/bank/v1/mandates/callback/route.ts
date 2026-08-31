import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiResponse } from "@/lib/api/handler";
import {
  assertBankPartnerAuth,
  bankPartnerService,
} from "@/lib/services/payment/bank-api.service";

const callbackSchema = z.object({
  mandateId: z.string().cuid(),
  providerReference: z.string().optional(),
  status: z.enum([
    "DRAFT",
    "PENDING_SUBMISSION",
    "SUBMITTED",
    "ADMIN_REVIEW",
    "BANK_PROCESSING",
    "ACTIVE",
    "REJECTED",
    "EXPIRED",
    "REVOKED",
    "ARCHIVED",
    "PENDING_MANUAL_RESOLUTION",
  ]),
  activatedAt: z.string().datetime().optional(),
  rejectedReason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertBankPartnerAuth(req);
    const parsed = callbackSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse({ error: "Invalid mandate callback payload" }, 400);
    }

    const result = await bankPartnerService.mandateCallback(parsed.data);
    return apiResponse(result, 200);
  } catch (error) {
    return apiError(error);
  }
}
