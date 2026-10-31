import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import {
  mapMessageUser,
  MESSAGE_USER_SELECT,
} from "@/lib/messaging/display";
import type { ChatMessage, ConversationSummary, TypingUser } from "@/lib/messaging/types";

const TYPING_ACTIVE_MS = 4000;

function mapConversation(
  conv: {
    id: string;
    updatedAt: Date;
    participants: {
      userId: string;
      lastReadAt: Date | null;
      user: Parameters<typeof mapMessageUser>[0];
    }[];
    messages: { id: string; content: string; createdAt: Date; senderId: string }[];
  },
  currentUserId: string,
  unreadCount = 0
): ConversationSummary {
  const lastMessage = conv.messages[0] ?? null;
  return {
    id: conv.id,
    updatedAt: conv.updatedAt.toISOString(),
    unreadCount,
    participants: conv.participants.map((p) => mapMessageUser(p.user)),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt.toISOString(),
          senderId: lastMessage.senderId,
        }
      : null,
  };
}

export class MessageService {
  async getOrCreateConversation(userIds: string[]) {
    const sorted = [...userIds].sort();
    const existing = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: { userId: { in: sorted } },
        },
      },
      include: {
        participants: true,
        messages: { take: 50, orderBy: { createdAt: "desc" } },
      },
    });

    if (existing && existing.participants.length === sorted.length) {
      return existing;
    }

    return prisma.conversation.create({
      data: {
        participants: {
          create: sorted.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: {
          include: { user: { select: MESSAGE_USER_SELECT } },
        },
        messages: true,
      },
    });
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: senderId },
    });
    if (!participant) throw new AppError("Not a participant");

    const message = await prisma.message.create({
      data: { conversationId, senderId, content, status: "SENT" },
      include: {
        sender: { select: MESSAGE_USER_SELECT },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      id: message.id,
      conversationId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      sender: mapMessageUser(message.sender),
    } satisfies ChatMessage & { conversationId: string };
  }

  async markRead(conversationId: string, userId: string) {
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, status: { not: "READ" } },
      data: { status: "READ" },
    });
  }

  async getConversationMessages(conversationId: string, userId: string) {
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) return [];

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: MESSAGE_USER_SELECT },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    await this.markRead(conversationId, userId);

    return messages.map(
      (message) =>
        ({
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          senderId: message.senderId,
          sender: mapMessageUser(message.sender),
        }) satisfies ChatMessage
    );
  }

  async listConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { select: MESSAGE_USER_SELECT } },
        },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const unreadCounts = await Promise.all(
      conversations.map(async (conv) => {
        const self = conv.participants.find((p) => p.userId === userId);
        return prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            ...(self?.lastReadAt ? { createdAt: { gt: self.lastReadAt } } : {}),
          },
        });
      })
    );

    return conversations.map((conv, index) =>
      mapConversation(conv, userId, unreadCounts[index] ?? 0)
    );
  }

  async getUnreadCount(userId: string) {
    const parts = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });
    if (!parts.length) return 0;

    const counts = await Promise.all(
      parts.map((part) =>
        prisma.message.count({
          where: {
            conversationId: part.conversationId,
            senderId: { not: userId },
            ...(part.lastReadAt ? { createdAt: { gt: part.lastReadAt } } : {}),
          },
        })
      )
    );

    return counts.reduce((sum, count) => sum + count, 0);
  }

  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) throw new AppError("Not a participant");

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { typingAt: isTyping ? new Date() : null },
    });
  }

  async getTypingUsers(conversationId: string, userId: string): Promise<TypingUser[]> {
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) return [];

    const cutoff = new Date(Date.now() - TYPING_ACTIVE_MS);
    const typers = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: userId },
        typingAt: { gte: cutoff },
      },
      include: {
        user: { select: MESSAGE_USER_SELECT },
      },
    });

    return typers.map((entry) => ({
      id: entry.userId,
      displayName: mapMessageUser(entry.user).displayName,
    }));
  }
}

export const messageService = new MessageService();
