import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { otpService } from "@/lib/services/otp.service";
import { notificationService } from "@/lib/services/notification.service";
import { apiResponse } from "@/lib/api/handler";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = typeof body?.email === "string" ? body.email : "";

  if (!email) return apiResponse({ error: "Email is required" }, 400);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return apiResponse({ sent: true });

  const code = await otpService.create(user.id, "PASSWORD_RESET", 15);
  await notificationService.create({
    userId: user.id,
    title: "Password reset code",
    body: `Use this code to reset your password: ${code}. It expires in 15 minutes.`,
    channel: "EMAIL",
    sendEmail: true,
  });

  return apiResponse({ sent: true });
}
