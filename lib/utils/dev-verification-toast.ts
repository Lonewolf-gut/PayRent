import { toast } from "sonner";

let lastToastedCode: string | null = null;

/**
 * Local testing helper — shows OTP in a toast when email/SMS is not delivered.
 * Disabled in production builds. Remove this file when no longer needed.
 */
export function showDevVerificationCodeToast(
  code: string | null | undefined,
  channel: "email" | "phone"
) {
  if (process.env.NODE_ENV !== "development") return;
  if (!code || code.length < 4) return;
  if (code === lastToastedCode) return;

  lastToastedCode = code;

  const label = channel === "email" ? "Email verification code" : "Phone verification code";

  toast.info(label, {
    description: code,
    duration: 45_000,
  });
}
