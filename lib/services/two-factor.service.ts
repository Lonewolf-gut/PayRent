import { TOTP, Secret } from "otpauth";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { AppError } from "@/lib/errors";

export class TwoFactorService {
  async enable(userId: string, email: string) {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: "RentForMe",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encrypt(secret.base32) },
    });

    return { otpauthUrl: totp.toString(), secret: secret.base32 };
  }

  async verify(userId: string, token: string) {
    await this.validateToken(userId, token);

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

    const totp = new TOTP({
      secret: decrypt(user.twoFactorSecret),
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) throw new AppError("Invalid 2FA code");

    return true;
  }
}

export const twoFactorService = new TwoFactorService();
