import { z } from "zod";

export const createPayoutBankSchema = z.object({
  name: z.string().trim().min(2).max(120),
  paystackCode: z.string().trim().min(2).max(32),
  resolveCode: z.string().trim().min(2).max(32).optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});
