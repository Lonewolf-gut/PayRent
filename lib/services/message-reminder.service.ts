import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/lib/services/notification.service";

const REMINDER_AFTER_MS = 15 * 60 * 1000;

export async function sendUnreadMessageEmailReminders() {
  const cutoff = new Date(Date.now() - REMINDER_AFTER_MS);

  const messages = await prisma.message.findMany({
    where: {
      status: { in: ["SENT", "DELIVERED"] },
      createdAt: { lte: cutoff },
      emailReminderSentAt: null,
    },
    include: {
      sender: { select: { email: true } },
      conversation: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, email: true, emailVerified: true } },
            },
          },
        },
      },
    },
    take: 100,
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;

  for (const message of messages) {
    const recipients = message.conversation.participants.filter(
      (participant) => participant.userId !== message.senderId
    );

    let emailedAnyone = false;

    for (const participant of recipients) {
      const unread =
        !participant.lastReadAt || participant.lastReadAt < message.createdAt;

      if (!unread || !participant.user.email) continue;

      await notificationService.deliverEmail(
        participant.user.id,
        "You have an unread message on PayRent",
        `${message.sender.email} sent you a message over 15 minutes ago: "${message.content.slice(0, 180)}${message.content.length > 180 ? "…" : ""}"`
      );
      emailedAnyone = true;
      sent += 1;
    }

    if (emailedAnyone) {
      await prisma.message.update({
        where: { id: message.id },
        data: { emailReminderSentAt: new Date() },
      });
    }
  }

  return { processed: messages.length, emailed: sent };
}
