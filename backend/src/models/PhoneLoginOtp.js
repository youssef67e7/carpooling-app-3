import mongoose from "mongoose";

const phoneLoginOtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, trim: true, index: true },
    otpDigest: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

phoneLoginOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PhoneLoginOtp = mongoose.model("PhoneLoginOtp", phoneLoginOtpSchema);
