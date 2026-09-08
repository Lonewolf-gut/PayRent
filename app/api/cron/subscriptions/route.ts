import { NextRequest } from "next/server";
import { subscriptionService } from "@/lib/services/subscription.service";
import { processExpiredTrials } from "@/lib/subscription/trial.service";
import { apiResponse } from "@/lib/api/handler";
import { authorizeCron } from "@/lib/cron/authorize";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return apiResponse(null, 401, "Unauthorized.");
  }

  const [expiry, trials] = await Promise.all([
    subscriptionService.expireDueSubscriptions(),
    processExpiredTrials(),
  ]);

  return apiResponse(
    { ...expiry, trials },
    200,
    "Subscription and trial jobs completed."
  );
}
