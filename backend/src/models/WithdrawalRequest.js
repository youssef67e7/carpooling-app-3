import mongoose from "mongoose";

const withdrawalRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    walletAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletAccount", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    /** SHA-256 of OTP + server secret (never store raw OTP in prod logs) */
    otpDigest: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "expired"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const WithdrawalRequest = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
