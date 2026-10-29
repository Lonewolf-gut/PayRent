import { TOTP, Secret } from "otpauth";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { AppError } from "@/lib/errors";

const ISSUER = process.env.PLATFORM_NAME ?? "PayForMe";

function sanitizeToken(token: string) {
  return token.replace(/\D/g, "").slice(0, 6);
}

export class TwoFactorService {
  async enable(userId: string, email: string) {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: ISSUER,
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encrypt(secret.base32), twoFactorEnabled: false },
    });

    return { otpauthUrl: totp.toString(), secret: secret.base32 };
  }

  private buildTotp(encryptedSecret: string) {
    return new TOTP({
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(decrypt(encryptedSecret)),
    });
  }

  private async verifySetupToken(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new AppError("2FA not configured");

    const normalized = sanitizeToken(token);
    if (normalized.length !== 6) throw new AppError("Invalid 2FA code");

    const totp = this.buildTotp(user.twoFactorSecret);
    const delta = totp.validate({ token: normalized, window: 2 });
    if (delta === null) throw new AppError("Invalid 2FA code");

    return true;
  }

  async verify(userId: string, token: string) {
    await this.verifySetupToken(userId, token);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return true;
  }

  async validateToken(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new AppError("2FA not configured");
    if (!user.twoFactorEnabled) throw new AppError("2FA is not enabled on this account");

    return this.verifySetupToken(userId, token);
  }

  async disable(userId: string, token: string) {
    await this.validateToken(userId, token);
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
    return { enabled: false };
  }

  async getStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });
    return {
      enabled: Boolean(user?.twoFactorEnabled),
      pendingSetup: Boolean(user?.twoFactorSecret && !user?.twoFactorEnabled),
    };
  }
}

export const twoFactorService = new TwoFactorService();
