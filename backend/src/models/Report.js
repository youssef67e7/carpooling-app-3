import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", default: null },
    reason: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    adminNote: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export const Report = mongoose.model("Report", reportSchema);
