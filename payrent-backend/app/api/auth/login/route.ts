import { NextRequest } from "next/server";
import { CredentialsSignin } from "next-auth";
import { authenticateCredentials } from "@/lib/auth/credentials-login";
import { apiResponse, apiError, withPublicHandler } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";

const signInErrorCodes: Record<string, string> = {
  missing_credentials: "Email and password are required",
  email_not_found: "No account found with this email",
  invalid_password: "Incorrect password",
  account_suspended: "This account has been suspended",
  account_locked: "Account locked due to too many failed attempts",
  two_factor_required: "Two-factor authentication code required",
  invalid_two_factor: "Invalid two-factor authentication code",
  database_unavailable: "Service temporarily unavailable",
};

export const POST = withPublicHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const otp = typeof body.otp === "string" ? body.otp : undefined;

  try {
    const user = await authenticateCredentials(email, password, otp, req);
    return apiResponse({ user }, 200, "Signed in successfully.");
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      const code = error.code ?? "invalid_password";
      return apiError(new AppError(signInErrorCodes[code] ?? "Sign in failed", 401, code));
    }
    return apiError(error);
  }
});
