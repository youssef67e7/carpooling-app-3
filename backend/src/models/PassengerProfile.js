import mongoose from "mongoose";

const passengerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

    /** Examples of passenger-only state; extend as needed. */
    preferences: { type: Object, default: {} },
    savedPlaces: { type: Array, default: [] },
    paymentMethods: { type: Array, default: [] },
  },
  { timestamps: true }
);

export const PassengerProfile = mongoose.model("PassengerProfile", passengerProfileSchema);

