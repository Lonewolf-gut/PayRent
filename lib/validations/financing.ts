import { z } from "zod";

export const financingRequestSchema = z.object({
  propertyId: z.string().cuid(),
  applicationId: z.string().cuid().optional(),
  requestedAmount: z.number().positive(),
  durationMonths: z.number().int().min(6).max(60),
  notes: z.string().max(500).optional(),
});

export const approveFinancingSchema = z.object({
  financingRequestId: z.string().cuid(),
  amount: z.number().positive(),
  interestRate: z.number().min(0).max(30),
  planType: z.enum(["MONTHLY", "DEFERRED", "CUSTOM"]),
  customSchedule: z
    .array(
      z.object({
        amount: z.number().positive(),
        dueDate: z.string().datetime(),
      })
    )
    .optional(),
});

export type FinancingRequestInput = z.infer<typeof financingRequestSchema>;
export type ApproveFinancingInput = z.infer<typeof approveFinancingSchema>;
