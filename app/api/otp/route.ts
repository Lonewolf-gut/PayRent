import { NextRequest } from "next/server";
import { otpSchema } from "@/lib/validations/auth";
import { otpService } from "@/lib/services/otp.service";
import { authService } from "@/lib/services/auth.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const parsed = otpSchema.safeParse(body);
  if (!parsed.success) return apiResponse({ error: "Invalid OTP" }, 400);

  const { code, purpose } = parsed.data;

  if (purpose === "EMAIL_VERIFY") {
    await authService.verifyEmail(session.user.id, code);
  } else if (purpose === "PHONE_VERIFY") {
    await authService.verifyPhone(session.user.id, code);
  } else {
    await otpService.verify(session.user.id, code, purpose);
  }

  return apiResponse({ verified: true });
});
