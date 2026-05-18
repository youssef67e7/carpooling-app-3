import { Router } from "express";
import { body, param, query } from "express-validator";
import { User } from "../models/User.js";
import { Ride } from "../models/Ride.js";
import { Report } from "../models/Report.js";
import { Transaction } from "../models/Transaction.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { fixedAdminOnly } from "../middleware/fixedAdmin.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { isFixedAdminEmail } from "../config/fixedAdmins.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";

const router = Router();

router.use(authRequired, blockCheck, roleRequired("admin"), fixedAdminOnly);

async function audit(req, { action, targetType, targetId, summary = "", detail = null }) {
  try {
    const ip =
      String(req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim() || req.ip || "";
    const ua = String(req.headers["user-agent"] || "").slice(0, 240);
    await AdminAuditLog.create({
      actorAdminId: req.userId,
      action,
      targetType,
      targetId,
      summary,
      detail,
      ip,
      ua,
    });
  } catch {
    // audit failure must not block admin actions
  }
}

router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(500);
    return res.json({ users: users.map((u) => u.toJSON()) });
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/users/:userId",
  param("userId").isMongoId(),
  body("is_verified").optional().isBoolean(),
  body("is_blocked").optional().isBoolean(),
  body("role").optional().isIn(["passenger", "driver"]),
  body("active_role").optional().isIn(["passenger", "driver"]),
  body("driver_application_status").optional().isIn(["none", "pending", "approved", "rejected"]),
  body("driver_profile_status").optional().isIn(["pending", "approved", "rejected"]),
  body("driver_review_note").optional().trim().isLength({ max: 800 }),
  body("blocked_until")
    .optional()
    .custom((v) => v === null || v === "" || (typeof v === "string" && !Number.isNaN(Date.parse(v)))),
  body("block_reason").optional().trim().isLength({ max: 500 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) throw new AppError("Not found", 404);
      const before = user.toJSON();
      if ("is_verified" in req.body) user.is_verified = Boolean(req.body.is_verified);
      if ("is_blocked" in req.body) user.is_blocked = Boolean(req.body.is_blocked);
      if ("role" in req.body) {
        user.role = req.body.role;
      }
      if ("active_role" in req.body) {
        user.active_role = req.body.active_role;
      }
      if ("driver_application_status" in req.body) {
        user.driver_application_status = req.body.driver_application_status;
      }

      if ("driver_profile_status" in req.body || "driver_review_note" in req.body) {
        const patch = {};
        if ("driver_profile_status" in req.body) patch.status = req.body.driver_profile_status;
        if ("driver_review_note" in req.body) patch.reviewNote = String(req.body.driver_review_note || "").slice(0, 800);
        await DriverProfile.updateOne({ userId: user._id }, { $set: patch }, { upsert: true });
      }
      if ("blocked_until" in req.body) {
        const v = req.body.blocked_until;
        user.blocked_until = v == null || v === "" ? null : new Date(v);
      }
      if ("block_reason" in req.body) user.block_reason = String(req.body.block_reason || "").slice(0, 500);

      // Driver approval/rejection should NOT force role switching.
      // We only update the application/profile statuses; the user can switch modes explicitly.
      if (user.driver_application_status === "approved") {
        user.is_verified = true;
        await DriverProfile.updateOne({ userId: user._id }, { $set: { status: "approved", reviewNote: "" } }, { upsert: true });
      }
      if (user.driver_application_status === "rejected") {
        // Safety: rejected drivers should never remain online as drivers.
        if (user.isOnline) user.isOnline = false;
        await DriverProfile.updateOne({ userId: user._id }, { $set: { status: "rejected" } }, { upsert: true });
      }
      await user.save();
      const after = user.toJSON();
      await audit(req, {
        action: "user.patch",
        targetType: "user",
        targetId: user._id,
        summary: `PATCH user ${user.email}`,
        detail: { patch: req.body, before: { is_blocked: before.is_blocked, is_verified: before.is_verified, driver_application_status: before.driver_application_status }, after: { is_blocked: after.is_blocked, is_verified: after.is_verified, driver_application_status: after.driver_application_status } },
      });
      return res.json({ user: user.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/users/:userId", param("userId").isMongoId(), validateRequest, async (req, res, next) => {
  try {
    if (String(req.params.userId) === String(req.userId)) {
      throw new AppError("Cannot delete yourself", 400);
    }
    const user = await User.findById(req.params.userId);
    if (!user) throw new AppError("Not found", 404);
    if (isFixedAdminEmail(user.email)) {
      throw new AppError("Cannot delete fixed administrator account", 400);
    }
    if (user.role === "admin") {
      const admins = await User.countDocuments({ role: "admin" });
      if (admins <= 1) throw new AppError("Cannot delete last admin", 400);
    }
    await User.deleteOne({ _id: user._id });
    await audit(req, {
      action: "user.delete",
      targetType: "user",
      targetId: user._id,
      summary: `DELETE user ${user.email}`,
      detail: { email: user.email, role: user.role },
    });
    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(400)
      .populate("reporterId", "name email role")
      .populate("reportedUserId", "name email role")
      .lean();
    return res.json({ reports });
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/reports/:id",
  param("id").isMongoId(),
  body("status").isIn(["open", "reviewing", "resolved", "dismissed"]),
  body("adminNote").optional().trim().isLength({ max: 1000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) throw new AppError("Not found", 404);
      const before = report.toJSON();
      report.status = req.body.status;
      if ("adminNote" in req.body) report.adminNote = String(req.body.adminNote || "").slice(0, 1000);
      await report.save();
      const populated = await Report.findById(report._id)
        .populate("reporterId", "name email role")
        .populate("reportedUserId", "name email role")
        .lean();
      await audit(req, {
        action: "report.patch",
        targetType: "report",
        targetId: report._id,
        summary: `PATCH report ${report._id}`,
        detail: { before: { status: before.status }, after: { status: report.status }, patch: req.body },
      });
      return res.json({ report: populated });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  "/transactions",
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("flagged").optional().isIn(["0", "1", "true", "false"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
      const q = {};
      if (req.query.flagged === "1" || req.query.flagged === "true") q.flagged = true;
      const txs = await Transaction.find(q)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("userId", "name email role")
        .populate("walletAccountId", "walletType phoneNumber label balance")
        .lean();
      return res.json({ transactions: txs });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/transactions/:id/flag",
  param("id").isMongoId(),
  body("flagged").isBoolean(),
  body("flaggedReason").optional().trim().isLength({ max: 500 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const tx = await Transaction.findById(req.params.id);
      if (!tx) throw new AppError("Not found", 404);
      const before = tx.toJSON();
      tx.flagged = Boolean(req.body.flagged);
      if ("flaggedReason" in req.body) tx.flaggedReason = String(req.body.flaggedReason || "").slice(0, 500);
      await tx.save();
      await audit(req, {
        action: "transaction.flag",
        targetType: "transaction",
        targetId: tx._id,
        summary: `FLAG tx ${tx._id} => ${tx.flagged ? "true" : "false"}`,
        detail: { before: { flagged: before.flagged }, after: { flagged: tx.flagged }, patch: req.body },
      });
      return res.json({ transaction: tx.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  "/audit",
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
      const logs = await AdminAuditLog.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("actorAdminId", "name email")
        .lean();
      return res.json({ logs });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/rides", async (req, res, next) => {
  try {
    const rides = await Ride.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("passengerId", "name email role profileImageUrl")
      .populate("driverId", "name email role profileImageUrl");
    return res.json({ rides });
  } catch (e) {
    next(e);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const [totalUsers, ridesByStatus, totalRides, driversOnline, activeRides] = await Promise.all([
      User.countDocuments(),
      Ride.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Ride.countDocuments(),
      User.countDocuments({ active_role: "driver", isOnline: true }),
      Ride.countDocuments({ status: { $in: ["accepted", "ongoing"] } }),
    ]);
    const stats = {
      totalUsers,
      totalRides,
      driversOnline,
      activeRides,
      ridesByStatus: ridesByStatus.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
      }, {}),
    };
    return res.json({ stats });
  } catch (e) {
    next(e);
  }
});

export default router;
