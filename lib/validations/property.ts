import { z } from "zod";

export const propertySchema = z.object({
  name: z.string().min(3),
  propertyType: z.enum([
    "APARTMENT",
    "HOUSE",
    "CONDO",
    "TOWNHOUSE",
    "STUDIO",
    "COMMERCIAL",
  ]),
  monthlyRent: z.number().positive(),
  annualRent: z.number().positive(),
  location: z.string().min(5),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().min(20),
  amenities: z.array(z.string()).optional(),
  availableFrom: z.string().datetime().optional(),
});

export const propertyFilterSchema = z.object({
  search: z.string().optional(),
  propertyType: z.string().optional(),
  minRent: z.coerce.number().optional(),
  maxRent: z.coerce.number().optional(),
  location: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(12),
});

export const agentSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  image: z.string().url().optional(),
});

export type PropertyInput = z.infer<typeof propertySchema>;
export type PropertyFilterInput = z.infer<typeof propertyFilterSchema>;
