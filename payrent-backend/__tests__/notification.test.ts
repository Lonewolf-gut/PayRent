import { describe, it, expect, vi } from "vitest";
import { notificationService } from "@/lib/services/notification.service";
import * as emailService from "@/lib/services/email.service";
import * as smsService from "@/lib/services/sms.service";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    notification: {
      create: vi.fn().mockResolvedValue({ id: "test" }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: "user-1", email: "test@example.com", phone: "+233501234567" }),
    },
  },
}));

vi.spyOn(emailService, "sendEmail").mockResolvedValue({ queued: true, mode: "log" });
vi.spyOn(smsService, "sendSms").mockResolvedValue({ provider: "log", to: "+233501234567", body: "test" });

describe("NotificationService", () => {
  it("creates in-app notifications and sends email by default", async () => {
    const result = await notificationService.create({
      userId: "user-1",
      title: "Hello",
      body: "World",
    });

    expect(result).toHaveProperty("id", "test");
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it("sends notifications over SMS channel", async () => {
    const records = await notificationService.send({
      userId: "user-1",
      type: "TEST_SMS",
      channels: ["SMS"],
      title: "Hi",
      message: "SMS body",
    });

    expect(records).toHaveLength(1);
    expect(smsService.sendSms).toHaveBeenCalled();
  });
});
