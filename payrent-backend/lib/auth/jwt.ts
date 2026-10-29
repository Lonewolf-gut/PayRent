import jwt, { type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@prisma/client";

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? "15m") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, options);
}

export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY ?? "7d") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET!
  ) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET!
  ) as TokenPayload;
}
