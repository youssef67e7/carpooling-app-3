import { z } from "zod";

export const updateUserSchema = z
  .object({
    isBlocked: z.boolean().optional(),
    role: z.enum(["user", "driver", "admin"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const paginatedQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(["pending", "resolved"]),
  adminNote: z.string().max(2000).optional(),
});

export const flagTransactionSchema = z.object({
  flagged: z.boolean(),
  note: z.string().max(500).optional(),
});

export const adminRefundSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().positive("Amount must be positive").max(50000, "Max refund is 50,000"),
  rideId: z.string().optional(),
  note: z.string().max(500).optional(),
});
