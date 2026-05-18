import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: "" },
  },
  { _id: false }
);

const routePointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const driverProposalSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    proposedFare: { type: Number, required: true },
    proposedAt: { type: Date, default: () => new Date() },
    /** Expiry for the offer so passenger doesn't accept stale prices */
    expiresAt: { type: Date, default: null },
    /** Snapshot for UI cards (avoid extra queries on every poll) */
    driverMeta: {
      name: { type: String, default: "" },
      profileImageUrl: { type: String, default: "" },
      carImageUrl: { type: String, default: "" },
      carColor: { type: String, default: "" },
      carSpec: { type: String, default: "" },
      availableSeats: { type: Number, default: null },
    },
  },
  { _id: false }
);

const parcelSchema = new mongoose.Schema(
  {
    /** Short description of what's being sent */
    description: { type: String, default: "", trim: true, maxlength: 200 },
    /** Optional: receiver details (can differ from passenger) */
    receiverName: { type: String, default: "", trim: true, maxlength: 80 },
    receiverPhone: { type: String, default: "", trim: true, maxlength: 32 },
    /** Optional special instructions */
    notes: { type: String, default: "", trim: true, maxlength: 500 },
    /** Optional: schedule / expected delivery */
    deliverBy: { type: Date, default: null },
    /** Server computed estimate for UI (seconds) */
    etaSeconds: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    pickupLocation: { type: pointSchema, required: true },
    destinationLocation: { type: pointSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "ongoing", "completed", "cancelled"],
      default: "pending",
    },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ["passenger", "driver", "admin"], default: null },
    cancelReason: { type: String, default: "", trim: true, maxlength: 300 },
    /** Service / vehicle key — must match Vehicle.typeKey */
    vehicleType: { type: String, default: "delivery", trim: true, lowercase: true },
    /**
     * Optional parcel info for shipping/delivery services.
     * Kept inside Ride to simplify tracking, chat, and admin moderation.
     */
    parcel: { type: parcelSchema, default: null },
    /** Estimated at booking from Vehicle pricing + distance (المقترح) */
    estimatedFare: { type: Number, default: 0 },
    /** Minimum the passenger is willing to pay (≥ suggested); can be raised while pending */
    passengerMinFare: { type: Number, default: null },
    /** After passenger accepts driver's price: driver must confirm before ride is assigned */
    awaitingDriverConfirm: { type: Boolean, default: false },
    preassignedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    preassignedFare: { type: Number, default: null },
    /** Agreed price once both sides confirm (driver assigned) */
    agreedFare: { type: Number, default: null },
    /** Pending driver price offer before passenger accepts */
    driverProposal: { type: driverProposalSchema, default: null },
    /** Final charged amount (set on trip end) */
    fare: { type: Number, default: null },
    /** Polyline path for map (mock or from Google Directions) */
    routePath: { type: [routePointSchema], default: [] },
    acceptedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    /** Passenger rates driver after trip (1–5), once */
    passengerRating: { type: Number, min: 1, max: 5, default: null },
    passengerReview: { type: String, default: "", maxlength: 500 },
    /** Vehicle passenger-seat capacity (integer, from Vehicle.capacity at booking time) */
    totalSeats: { type: Number, default: 4, min: 1, max: 20 },
    /** Remaining capacity in “seat units” (fractional for LARGE/XL logic) */
    availableSeatUnits: { type: Number, min: 0 },

    /** Multi-passenger pooling controls */
    poolingEnabled: { type: Boolean, default: true, index: true },
    passengerGenderPolicy: {
      type: String,
      enum: ["all", "male_only", "female_only"],
      default: "all",
      index: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

rideSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "rideId",
});

export const Ride = mongoose.model("Ride", rideSchema);
