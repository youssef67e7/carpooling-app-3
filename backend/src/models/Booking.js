import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true, index: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** Number of people in this booking (same size class) */
    passengerCount: { type: Number, required: true, min: 1, max: 20 },
    passengerSize: {
      type: String,
      required: true,
      enum: ["SMALL", "MEDIUM", "LARGE", "XL"],
      uppercase: true,
      trim: true,
    },
    /** Seat units consumed (e.g. XL single = 2, LARGE×2 = 3) */
    seatsReserved: { type: Number, required: true, min: 0.5 },
    passengerGender: {
      type: String,
      enum: ["male", "female", "unspecified"],
      default: "unspecified",
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      index: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ rideId: 1, passengerId: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
