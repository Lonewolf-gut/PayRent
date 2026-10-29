import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { otpService } from "@/lib/services/otp.service";
import { notificationService } from "@/lib/services/notification.service";
import { apiResponse } from "@/lib/api/handler";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return apiResponse({ error: "Email and password are required" }, 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return apiResponse({ requires2fa: false });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid || !user.twoFactorEnabled) {
    return apiResponse({ requires2fa: false });
  }

  const code = await otpService.create(user.id, "2FA_LOGIN", 10);
  await notificationService.create({
    userId: user.id,
    title: "Your 2FA sign-in code",
    body: `Use this one-time code to sign in: ${code}. It expires in 10 minutes.`,
    channel: "EMAIL",
    sendEmail: true,
  });

  return apiResponse({ requires2fa: true });
}
