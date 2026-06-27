import { z } from "zod";

export const toggleStatusSchema = z.object({
  isOnline: z.boolean(),
  isAvailable: z.boolean().optional(),
});

export const driverLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const carSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  color: z.string().min(1, "Color is required"),
  plateNumber: z.string().min(1, "Plate number is required"),
  type: z.string().min(1, "Vehicle type is required"),
});

export const updateCarSchema = carSchema.partial();

export const selectCarSchema = z.object({
  carId: z.string().min(1, "Car ID is required"),
});

export const earningsQuerySchema = z.object({
  period: z.enum(["day", "week", "month"]).optional().default("day"),
});

export const ratingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const insightsQuerySchema = z.object({
  period: z.enum(["day", "week", "month"]).optional().default("week"),
});
