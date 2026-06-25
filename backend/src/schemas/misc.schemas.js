import { z } from "zod";

export const switchRoleSchema = z.object({
  role: z.enum(["passenger", "driver"]),
});

export const reportUserSchema = z.object({
  reportedUserId: z.string().min(1, "Reported user ID is required"),
  rideId: z.string().optional(),
  reason: z.string().min(1, "Reason is required").max(2000),
});

export const saveProfileImageSchema = z.object({
  imageUrl: z.string().url("Must be a valid URL"),
});

export const registerFcmTokenSchema = z.object({
  token: z.string().min(1, "FCM token is required"),
  platform: z.enum(["android", "ios"]),
});

export const notificationsQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
