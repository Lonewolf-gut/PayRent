import { z } from "zod";

export const createMandateSchema = z.object({
  financingRequestId: z.string().min(1),
  bankAccountId: z.string().min(1),
  mandateType: z.enum(["DIRECT_DEBIT", "STANDING_ORDER"]).default("DIRECT_DEBIT"),
  mandateSource: z
    .enum(["SCANNED_UPLOAD", "PLATFORM_GENERATED"])
    .default("PLATFORM_GENERATED"),
  documentUrl: z.string().url().optional(),
});

export const submitMandateSchema = z.object({
  documentUrl: z.string().url().optional(),
});

export const reviewMandateSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectedReason: z.string().max(1000).optional(),
});

export type CreateMandateInput = z.infer<typeof createMandateSchema>;
export type SubmitMandateInput = z.infer<typeof submitMandateSchema>;
export type ReviewMandateInput = z.infer<typeof reviewMandateSchema>;
