import { NextRequest } from "next/server";
import { notificationService } from "@/lib/services/notification.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (req, _ctx, session) => {
  const all = req.nextUrl.searchParams.get("all") === "true";
  if (all) {
    const [items, unreadCount] = await Promise.all([
      notificationService.getAll(session.user.id),
      notificationService.getUnreadCount(session.user.id),
    ]);
    return apiResponse({ items, unreadCount });
  }

  const notifications = await notificationService.getUnread(session.user.id);
  return apiResponse(notifications);
});

export const PATCH = withAuth(async (req: NextRequest, _ctx, session) => {
  const { id } = await req.json();
  await notificationService.markRead(id, session.user.id);
  return apiResponse({ ok: true });
});

export const DELETE = withAuth(async (_req, _ctx, session) => {
  await notificationService.clearAll(session.user.id);
  return apiResponse({ cleared: true });
});
