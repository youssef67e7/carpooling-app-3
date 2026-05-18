import mongoose from "mongoose";

const adminAccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const AdminAccount = mongoose.model("AdminAccount", adminAccountSchema);
