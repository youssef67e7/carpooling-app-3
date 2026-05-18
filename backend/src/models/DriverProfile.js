import mongoose from "mongoose";

const carSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
    brand: { type: String, required: true, trim: true, maxlength: 80 },
    model: { type: String, required: true, trim: true, maxlength: 80 },
    color: { type: String, required: true, trim: true, maxlength: 40 },
    plateNumber: { type: String, required: true, trim: true, maxlength: 24 },
    seats: { type: Number, required: true, min: 2, max: 20 },
    /** Real car category (separate from service class used for matching/pricing) */
    carCategory: { type: String, enum: ["sedan", "suv", "van"], default: "sedan", lowercase: true, trim: true },
    /** Optional: override service class while driving this car (future-safe) */
    serviceClassOverride: { type: String, default: null, trim: true, lowercase: true },
  },
  { _id: true }
);

const driverProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    /** Admin note shown to driver when rejected / needs changes */
    reviewNote: { type: String, default: "", trim: true, maxlength: 800 },

    licenseNumber: { type: String, default: "", trim: true, maxlength: 64 },
    licenseImageUrl: { type: String, default: "", trim: true, maxlength: 500 },
    licenseExpiry: { type: Date, default: null },

    /** Multi-car support */
    cars: { type: [carSchema], default: [] },
    selectedCarId: { type: mongoose.Schema.Types.ObjectId, default: null },

    /** Backward compatibility (older clients) */
    carImageUrl: { type: String, default: "", trim: true, maxlength: 500 },
    carBrand: { type: String, default: "", trim: true, maxlength: 80 },
    carModel: { type: String, default: "", trim: true, maxlength: 80 },
    carColor: { type: String, default: "", trim: true, maxlength: 40 },
    carPlateNumber: { type: String, default: "", trim: true, maxlength: 24 },
    numberOfSeats: { type: Number, default: 4, min: 2, max: 20 },
  },
  { timestamps: true }
);

export const DriverProfile = mongoose.model("DriverProfile", driverProfileSchema);
