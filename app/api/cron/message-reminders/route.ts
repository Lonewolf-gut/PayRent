import { NextRequest } from "next/server";
import { authorizeCron } from "@/lib/cron/authorize";
import { sendUnreadMessageEmailReminders } from "@/lib/services/message-reminder.service";
import { apiResponse } from "@/lib/api/handler";

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return apiResponse(null, 401, "Unauthorized.");
  }

  const result = await sendUnreadMessageEmailReminders();
  return apiResponse(result, 200, "Unread message reminders processed.");
}
