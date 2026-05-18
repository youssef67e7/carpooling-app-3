import mongoose from "mongoose";

export const WALLET_TYPES = ["cash", "instapay", "vodafone", "etisalat", "orange", "wepay"];

const walletAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    walletType: { type: String, enum: WALLET_TYPES, required: true },
    /** MSISDN for mobile wallets / InstaPay identifier */
    phoneNumber: { type: String, default: "", trim: true, maxlength: 32 },
    balance: { type: Number, default: 0, min: 0 },
    label: { type: String, default: "", trim: true, maxlength: 80 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

walletAccountSchema.index({ userId: 1, walletType: 1 });

export const WalletAccount = mongoose.model("WalletAccount", walletAccountSchema);
