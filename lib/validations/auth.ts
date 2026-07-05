import { z } from "zod";

const normalizedEmail = z
  .string()
  .min(1, "Please enter your email address")
  .email("Please enter a valid email address")
  .transform((value) => value.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(9, "Password must be more than 8 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must include at least one special character (e.g. !@#$%)"
  );

export const registerSchema = z.object({
  email: normalizedEmail,
  password: passwordSchema,
  fullName: z.string().min(2, "Please enter your full name"),
  phone: z.string().min(10, "Please enter a valid phone number").optional(),
  role: z.enum(["TENANT", "LANDLORD", "AGENT", "LENDER"]),
  entityType: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
  companyName: z.string().min(2).optional(),
}).superRefine((data, ctx) => {
  if (data.entityType === "COMPANY" && !data.companyName?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Company name is required for business accounts.",
      path: ["companyName"],
    });
  }
});

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, "Please enter your password"),
  otp: z.string().length(6, "Authentication code must be 6 digits").optional(),
});

export const otpSchema = z.object({
  code: z.string().length(6, "OTP must be 6 digits"),
  purpose: z.enum([
    "EMAIL_VERIFY",
    "PHONE_VERIFY",
    "WITHDRAWAL",
    "TRANSFER",
    "2FA",
  ]),
});

export const pinSchema = z.object({
  pin: z.string().length(4).regex(/^\d+$/, "PIN must be 4 digits"),
});

export const resetPasswordSchema = z.object({
  email: normalizedEmail,
  code: z.string().length(6, "Reset code must be 6 digits"),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function firstZodIssueMessage(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}
