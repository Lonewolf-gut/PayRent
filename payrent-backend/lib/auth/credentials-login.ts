import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, ensureDbConnection } from "@/lib/db/prisma";
import { logLoginAttempt } from "@/lib/auth/login-log";
import {
  AccountLockedError,
  AccountSuspendedError,
  EmailNotFoundError,
  InvalidPasswordError,
  InvalidTwoFactorError,
  MissingCredentialsError,
  TwoFactorRequiredError,
  DatabaseUnavailableError,
} from "@/lib/auth/sign-in-errors";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
  image: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
};

export async function authenticateCredentials(
  emailInput: string,
  password: string,
  otp?: string,
  request?: NextRequest | Request
): Promise<AuthenticatedUser> {
  if (!emailInput || !password) {
    throw new MissingCredentialsError();
  }

  const email = emailInput.trim().toLowerCase();

  try {
    await ensureDbConnection();
  } catch {
    throw new DatabaseUnavailableError();
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch {
    throw new DatabaseUnavailableError();
  }

  if (!user) {
    await logLoginAttempt(null, false, email, request);
    throw new EmailNotFoundError();
  }

  if (!user.isActive) {
    await logLoginAttempt(user.id, false, user.email, request);
    throw new AccountSuspendedError();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await logLoginAttempt(user.id, false, user.email, request);
    throw new AccountLockedError();
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failedCount = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failedCount,
        lockedUntil:
          failedCount >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : undefined,
      },
    });
    await logLoginAttempt(user.id, false, user.email, request);
    if (failedCount >= 5) {
      throw new AccountLockedError();
    }
    throw new InvalidPasswordError();
  }

  if (user.twoFactorEnabled) {
    if (!otp) {
      throw new TwoFactorRequiredError();
    }

    const { twoFactorService } = await import("@/lib/services/two-factor.service");
    try {
      await twoFactorService.validateToken(user.id, String(otp));
    } catch {
      await logLoginAttempt(user.id, false, user.email, request);
      throw new InvalidTwoFactorError();
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  await logLoginAttempt(user.id, true, user.email, request);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    image: user.image,
    twoFactorEnabled: user.twoFactorEnabled,
    emailVerified: Boolean(user.emailVerified),
    phoneVerified: Boolean(user.phoneVerified),
  };
}
