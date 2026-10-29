import { messageService } from "@/lib/services/message.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (_req, ctx, session) => {
  const { conversationId } = await ctx.params;
  const messages = await messageService.getConversationMessages(
    conversationId,
    session.user.id
  );
  await messageService.markRead(conversationId, session.user.id);
  return apiResponse(messages);
});
