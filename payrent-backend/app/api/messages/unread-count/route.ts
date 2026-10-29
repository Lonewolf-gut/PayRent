import { apiResponse, withAuth } from "@/lib/api/handler";
import { messageService } from "@/lib/services/message.service";

export const GET = withAuth(async (_req, _ctx, session) => {
  const count = await messageService.getUnreadCount(session.user.id);
  return apiResponse({ count });
});
