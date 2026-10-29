import { NextRequest } from "next/server";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, apiError, withPublicHandler } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";

export const POST = withPublicHandler(async (req: NextRequest) => {
  const { refreshToken } = await req.json();
  if (!refreshToken) {
    return apiError(new AppError("Refresh token required", 400));
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return apiError(new AppError("Invalid refresh token", 401));
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.isActive) {
    return apiError(new AppError("User inactive", 401));
  }

  const tokens = {
    accessToken: signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
    refreshToken: signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
  };

  return apiResponse(tokens);
});
