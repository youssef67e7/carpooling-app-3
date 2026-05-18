import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["passenger", "driver", "admin"], required: true },
    /**
     * Active app mode for non-admin users.
     * For backward compatibility, we currently keep `role` in sync with `active_role` for passenger/driver.
     */
    active_role: { type: String, enum: ["passenger", "driver"], default: "passenger", index: true },
    isOnline: { type: Boolean, default: false },
    location: { type: locationSchema, default: () => ({ lat: 0, lng: 0 }) },
    profileImageUrl: { type: String, default: "", trim: true },
    /** E.164 or local digits; used for tel: between driver & passenger */
    phone: { type: String, default: "", trim: true, maxlength: 32 },
    /** Driver tier — only rides with matching vehicleType appear in their list */
    vehicleType: { type: String, default: "delivery", trim: true, lowercase: true },
    /** Admin moderation */
    is_verified: { type: Boolean, default: true },
    is_blocked: { type: Boolean, default: false },
    /** If set and in the future while is_blocked, treated as temporary suspension */
    blocked_until: { type: Date, default: null },
    block_reason: { type: String, default: "", trim: true, maxlength: 500 },
    /** Driver application: passenger applies, admin approves to become driver */
    driver_application_status: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
      index: true,
    },
    /** Google account subject (`sub` claim); sparse unique for OAuth users */
    googleSub: { type: String, default: null, sparse: true, unique: true, trim: true },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model("User", userSchema);
