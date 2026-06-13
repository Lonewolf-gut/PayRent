import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";

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
        participants: { include: { user: { select: { id: true, email: true, image: true } } } },
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
        sender: { select: { id: true, email: true, image: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
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

    return prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  }

  async listConversations(userId: string) {
    return prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { select: { id: true, email: true, image: true } } },
        },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}

export const messageService = new MessageService();
