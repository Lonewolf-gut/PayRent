import { z } from "zod";

export const createApplicationSchema = z.object({
  propertyId: z.string().min(1),
  requestedMoveInDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export const reviewApplicationSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "CLARIFICATION"]),
  decisionReason: z.string().max(1000).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;
