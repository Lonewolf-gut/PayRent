import { NextRequest } from "next/server";
import { z } from "zod";
import { messageService } from "@/lib/services/message.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (_req, ctx, session) => {
  const { conversationId } = await ctx.params;
  const typers = await messageService.getTypingUsers(conversationId, session.user.id);
  return apiResponse({ typers });
});

export const POST = withAuth(async (req: NextRequest, ctx, session) => {
  const { conversationId } = await ctx.params;
  const body = await req.json();
  const schema = z.object({ typing: z.boolean() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

  await messageService.setTyping(conversationId, session.user.id, parsed.data.typing);
  return apiResponse({ ok: true });
});
