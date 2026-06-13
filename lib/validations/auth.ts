import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number required").optional(),
  role: z.enum(["TENANT", "LANDLORD", "AGENT", "LENDER"]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().length(6).optional(),
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
