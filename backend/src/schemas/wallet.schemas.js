import { z } from "zod";

export const createWalletAccountSchema = z.object({
  accountType: z.enum(["cash", "instapay", "vodafone", "etisalat", "orange", "wepay"]),
  accountLabel: z.string().min(1, "Label is required").max(100),
  accountDetails: z.record(z.string(), z.unknown()),
});

export const depositSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(10000, "Max deposit is 10,000"),
  walletAccountId: z.string().min(1, "Wallet account ID is required"),
  idempotencyKey: z.string().min(1).max(128).optional(),
});

export const withdrawSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(10000, "Max withdrawal is 10,000"),
  walletAccountId: z.string().min(1, "Wallet account ID is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.string().optional(),
});
