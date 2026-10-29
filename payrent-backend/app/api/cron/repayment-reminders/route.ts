import { NextRequest } from "next/server";
import { repaymentService } from "@/lib/services/repayment.service";
import { apiResponse } from "@/lib/api/handler";
import { authorizeCron } from "@/lib/cron/authorize";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return apiResponse(null, 401, "Unauthorized.");
  }

  const result = await repaymentService.sendRepaymentReminders();
  return apiResponse(result, 200, "Repayment reminders sent.");
}
