import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";

export class OtpService {
  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async create(userId: string, purpose: string, ttlMinutes = 10) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await prisma.otpCode.create({
      data: { userId, code, purpose, expiresAt },
    });

    return code;
  }

  async verify(userId: string, code: string, purpose: string) {
    const otp = await prisma.otpCode.findFirst({
      where: {
        userId,
        purpose,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");
    }

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return true;
  }
}

export const otpService = new OtpService();
