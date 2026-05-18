import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    walletAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletAccount", default: null },
    amount: { type: Number, required: true },
    /** deposit | withdraw | ride_payment | ride_charge | adjustment */
    type: {
      type: String,
      enum: ["deposit", "withdraw", "ride_payment", "ride_charge", "adjustment"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true,
    },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", default: null },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    /** Admin-only flag for review queue */
    flagged: { type: Boolean, default: false },
    flaggedReason: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
