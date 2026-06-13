import { NextRequest } from "next/server";
import { z } from "zod";
import { messageService } from "@/lib/services/message.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (_req, _ctx, session) => {
  const conversations = await messageService.listConversations(session.user.id);
  return apiResponse(conversations);
});

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const schema = z.object({
    recipientId: z.string().cuid().optional(),
    conversationId: z.string().cuid().optional(),
    content: z.string().min(1).max(5000),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

  let conversationId = parsed.data.conversationId;
  if (!conversationId && parsed.data.recipientId) {
    const conv = await messageService.getOrCreateConversation([
      session.user.id,
      parsed.data.recipientId,
    ]);
    conversationId = conv.id;
  }
  if (!conversationId) return apiResponse({ error: "Conversation required" }, 400);

  const message = await messageService.sendMessage(
    conversationId,
    session.user.id,
    parsed.data.content
  );
  return apiResponse(message, 201);
});
