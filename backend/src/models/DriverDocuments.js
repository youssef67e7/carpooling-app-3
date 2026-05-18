import mongoose from "mongoose";

const driverDocumentsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    criminalRecordFrontUrl: { type: String, required: true, trim: true, maxlength: 500 },
    criminalRecordBackUrl: { type: String, required: true, trim: true, maxlength: 500 },
    nationalIdNumber: { type: String, required: true, trim: true, maxlength: 32 },
  },
  { timestamps: true }
);

export const DriverDocuments = mongoose.model("DriverDocuments", driverDocumentsSchema);
