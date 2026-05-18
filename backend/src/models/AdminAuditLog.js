import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 64, index: true },
    targetType: { type: String, required: true, trim: true, maxlength: 32, index: true }, // user|ride|report|transaction
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    summary: { type: String, default: "", trim: true, maxlength: 300 },
    detail: { type: Object, default: null },
    ip: { type: String, default: "", trim: true, maxlength: 64 },
    ua: { type: String, default: "", trim: true, maxlength: 240 },
  },
  { timestamps: true }
);

export const AdminAuditLog = mongoose.model("AdminAuditLog", adminAuditLogSchema);

