import { NextRequest } from "next/server";
import { notificationService } from "@/lib/services/notification.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (req, _ctx, session) => {
  const all = req.nextUrl.searchParams.get("all") === "true";
  const notifications = all
    ? await notificationService.getAll(session.user.id)
    : await notificationService.getUnread(session.user.id);
  return apiResponse(notifications);
});

export const PATCH = withAuth(async (req: NextRequest, _ctx, session) => {
  const { id } = await req.json();
  await notificationService.markRead(id, session.user.id);
  return apiResponse({ ok: true });
});
