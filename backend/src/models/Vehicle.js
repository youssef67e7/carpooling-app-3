import mongoose from "mongoose";

/** Stable keys (e.g. shipping | delivery | travel | motorcycle) — Ride.vehicleType & User.vehicleType */
const vehicleSchema = new mongoose.Schema(
  {
    typeKey: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    /** i18n key suffix, e.g. delivery → t('vehicleType_delivery') */
    nameKey: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1, max: 20 },
    baseFare: { type: Number, required: true, min: 0 },
    pricePerKm: { type: Number, required: true, min: 0 },
    image: { type: String, default: "", trim: true, maxlength: 500 },
    /** Marker hint: truck | package | car | bike | van | premium | car (legacy) */
    icon: { type: String, default: "car", trim: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
