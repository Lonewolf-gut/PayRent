import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { otpService } from "@/lib/services/otp.service";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { apiResponse, apiError } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      new AppError(parsed.error.issues[0]?.message ?? "Validation failed", 400)
    );
  }

  const { email, code, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return apiError(new AppError("Invalid reset code", 400));
  }

  await otpService.verify(user.id, code, "PASSWORD_RESET");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  return apiResponse({ reset: true });
}
