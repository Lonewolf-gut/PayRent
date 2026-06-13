import { z } from "zod";

export const tenantProfileSchema = z.object({
  dateOfBirth: z.string().optional(),
  occupation: z.string().min(2).optional(),
  employerName: z.string().min(2).optional(),
  monthlyIncome: z.number().positive().optional(),
  residentialAddress: z.string().min(5).optional(),
});

export const ghanaCardVerifySchema = z.object({
  ghanaCardNumber: z
    .string()
    .regex(/^GHA-\d{9}-\d$/, "Invalid Ghana Card format (GHA-XXXXXXXXX-X)"),
  fullName: z.string().min(2),
  dateOfBirth: z.string().optional(),
});

export const bankAccountSchema = z.object({
  accountType: z.enum(["BANK", "MOMO"]).default("BANK"),
  bankCode: z.string().optional(),
  bankName: z.string().min(2),
  accountNumber: z.string().min(8),
  accountName: z.string().min(2),
  isDefault: z.boolean().default(false),
});

export type TenantProfileInput = z.infer<typeof tenantProfileSchema>;
export type GhanaCardVerifyInput = z.infer<typeof ghanaCardVerifySchema>;
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
