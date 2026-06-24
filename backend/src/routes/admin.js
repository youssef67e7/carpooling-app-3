import { Router } from "express";
import { body, param, query } from "express-validator";
import { User } from "../models/User.js";
import { Ride } from "../models/Ride.js";
import { globalRatingStats } from "../services/driverRating.js";
import { countMongoCollections } from "../mongo/schema.js";
import { getMongoConnectionInfo, getDb } from "../mongo/client.js";
import { Report } from "../models/Report.js";
import { Transaction } from "../models/Transaction.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { fixedAdminOnly } from "../middleware/fixedAdmin.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { docIdParam } from "../middleware/docId.js";
import { AppError } from "../errors/AppError.js";
import { isFixedAdminEmail } from "../config/fixedAdmins.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";

const router = Router();

router.use(authRequired, blockCheck, roleRequired("admin"), fixedAdminOnly);

function wantsPaginatedList(req) {
  return req.query.page != null || req.query.limit != null;
}

function parsePagination(req, { defaultLimit = 7, maxLimit = 100 } = {}) {
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
  const page = Math.max(1, Number(req.query.page) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function paginationMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return { page, limit, total, totalPages };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

router.get(
  "/users",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().trim().isLength({ max: 120 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const filter = {};
      const search = String(req.query.search || "").trim();
      if (search) {
        const rx = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
      }
      if (!wantsPaginatedList(req)) {
        const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);
        return res.json({ users: users.map((u) => u.toJSON()) });
      }
      const { limit, page, skip } = parsePagination(req);
      const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(filter),
      ]);
      return res.json({
        users: users.map((u) => u.toJSON()),
        pagination: paginationMeta(total, page, limit),
      });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/users/:userId",
  docIdParam("userId"),
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

router.delete("/users/:userId", docIdParam("userId"), validateRequest, async (req, res, next) => {
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

router.get(
  "/reports",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().trim().isLength({ max: 120 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const filter = {};
      const search = String(req.query.search || "").trim();
      if (search) {
        const rx = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ reason: rx }, { description: rx }, { status: rx }];
      }
      if (!wantsPaginatedList(req)) {
        const reports = await Report.find(filter)
          .sort({ createdAt: -1 })
          .limit(400)
          .populate("reporterId", "name email role")
          .populate("reportedUserId", "name email role")
          .lean();
        return res.json({ reports });
      }
      const { limit, page, skip } = parsePagination(req);
      const [reports, total] = await Promise.all([
        Report.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("reporterId", "name email role")
          .populate("reportedUserId", "name email role")
          .lean(),
        Report.countDocuments(filter),
      ]);
      return res.json({ reports, pagination: paginationMeta(total, page, limit) });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/reports/:id",
  docIdParam("id"),
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
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("flagged").optional().isIn(["0", "1", "true", "false"]),
  query("search").optional().trim().isLength({ max: 120 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const q = {};
      if (req.query.flagged === "1" || req.query.flagged === "true") q.flagged = true;
      const search = String(req.query.search || "").trim();
      if (search) {
        const rx = new RegExp(escapeRegex(search), "i");
        q.$or = [{ type: rx }, { status: rx }, { flaggedReason: rx }];
      }
      if (!wantsPaginatedList(req)) {
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
        const txs = await Transaction.find(q)
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("userId", "name email role")
          .populate("walletAccountId", "walletType phoneNumber label balance")
          .lean();
        return res.json({ transactions: txs });
      }
      const { limit, page, skip } = parsePagination(req);
      const [txs, total] = await Promise.all([
        Transaction.find(q)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("userId", "name email role")
          .populate("walletAccountId", "walletType phoneNumber label balance")
          .lean(),
        Transaction.countDocuments(q),
      ]);
      return res.json({ transactions: txs, pagination: paginationMeta(total, page, limit) });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/transactions/:id/flag",
  docIdParam("id"),
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
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().trim().isLength({ max: 120 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const filter = {};
      const search = String(req.query.search || "").trim();
      if (search) {
        const rx = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ action: rx }, { targetType: rx }, { summary: rx }];
      }
      if (!wantsPaginatedList(req)) {
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
        const logs = await AdminAuditLog.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("actorAdminId", "name email")
          .lean();
        return res.json({ logs });
      }
      const { limit, page, skip } = parsePagination(req);
      const [logs, total] = await Promise.all([
        AdminAuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("actorAdminId", "name email")
          .lean(),
        AdminAuditLog.countDocuments(filter),
      ]);
      return res.json({ logs, pagination: paginationMeta(total, page, limit) });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  "/rides",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().trim().isLength({ max: 120 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const filter = {};
      const search = String(req.query.search || "").trim();
      if (search) {
        const rx = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ status: rx }];
      }
      if (!wantsPaginatedList(req)) {
        const rides = await Ride.find(filter)
          .sort({ createdAt: -1 })
          .limit(200)
          .populate("passengerId", "name email role profileImageUrl")
          .populate("driverId", "name email role profileImageUrl");
        return res.json({ rides });
      }
      const { limit, page, skip } = parsePagination(req);
      const [rides, total] = await Promise.all([
        Ride.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("passengerId", "name email role profileImageUrl")
          .populate("driverId", "name email role profileImageUrl"),
        Ride.countDocuments(filter),
      ]);
      return res.json({ rides, pagination: paginationMeta(total, page, limit) });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/stats", async (req, res, next) => {
  try {
    const [
      totalUsers,
      ridesByStatus,
      totalRides,
      driversOnline,
      activeRides,
      ratingStats,
      openReports,
      completedRides,
      pendingDrivers,
      flaggedTx,
      totalDrivers,
      recentActivity,
      recentRides,
    ] = await Promise.all([
      User.countDocuments(),
      Ride.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Ride.countDocuments(),
      User.countDocuments({ active_role: "driver", isOnline: true }),
      Ride.countDocuments({ status: { $in: ["accepted", "ongoing"] } }),
      globalRatingStats(),
      Report.countDocuments({ status: "open" }),
      Ride.countDocuments({ status: "completed" }),
      User.countDocuments({ driver_application_status: "pending" }),
      Transaction.countDocuments({ flagged: true }),
      User.countDocuments({ driver_application_status: "approved" }),
      AdminAuditLog.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("actorAdminId", "name email")
        .lean(),
      Ride.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("passengerId", "name email")
        .populate("driverId", "name email")
        .lean(),
    ]);
    const stats = {
      totalUsers,
      totalRides,
      driversOnline,
      activeRides,
      completedRides,
      pendingDrivers,
      flaggedTx,
      totalDrivers,
      averageRating: ratingStats.averageRating,
      totalRatings: ratingStats.totalRatings,
      openReports,
      database: {
        ...getMongoConnectionInfo(),
        collections: await countMongoCollections(getDb),
      },
      ridesByStatus: ridesByStatus.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
      }, {}),
      recentActivity: recentActivity.map((l) => ({
        id: l._id,
        action: l.action,
        summary: l.summary,
        targetType: l.targetType,
        createdAt: l.createdAt,
        actor: l.actorAdminId?.name || l.actorAdminId?.email || null,
      })),
      recentRides: recentRides.map((r) => ({
        id: r._id,
        status: r.status,
        fare: r.agreedFare ?? r.estimatedFare ?? null,
        createdAt: r.createdAt,
        passenger: r.passengerId?.name || r.passengerId?.email || null,
        driver: r.driverId?.name || r.driverId?.email || null,
      })),
    };
    return res.json({ stats });
  } catch (e) {
    next(e);
  }
});

export default router;
