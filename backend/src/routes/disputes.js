import { Router } from "express";
import { body, param, query } from "express-validator";
import { Dispute } from "../models/Dispute.js";
import { User } from "../models/User.js";
import { Ride } from "../models/Ride.js";
import { Message } from "../models/Message.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { fixedAdminOnly } from "../middleware/fixedAdmin.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { validate } from "../middleware/validate.js";
import { docIdBody, docIdParam } from "../middleware/docId.js";
import { AppError } from "../errors/AppError.js";
import { logAction } from "../utils/logger.js";

const router = Router();

router.use(authRequired, blockCheck);

function parsePagination(req, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
  const page = Math.max(1, Number(req.query.page) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

// ─── User: create dispute ────────────────────────────────────────────────────

router.post(
  "/",
  docIdBody("rideId"),
  body("reason").trim().notEmpty().isLength({ max: 500 }),
  body("description").trim().notEmpty().isLength({ max: 2000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId, reason, description } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride) throw new AppError("Ride not found", 404);
      const uid = String(req.userId);
      const isPassenger = String(ride.passengerId) === uid;
      const isDriver = String(ride.driverId) === uid;
      if (!isPassenger && !isDriver) throw new AppError("Not part of this ride", 403);
      const existing = await Dispute.findOne({ rideId, status: { $nin: ["dismissed", "resolved"] } });
      if (existing) throw new AppError("An open dispute already exists for this ride", 400);
      const respondentId = isPassenger ? ride.driverId : ride.passengerId;
      const dispute = await Dispute.create({
        rideId,
        initiatorId: req.userId,
        respondentId,
        reason: String(reason).trim(),
        description: String(description).trim(),
        status: "open",
      });
      const populated = await Dispute.findById(dispute._id)
        .populate("initiatorId", "name email role")
        .populate("respondentId", "name email role")
        .lean();
      logAction({ req, action: "Dispute created", file: "routes/disputes.js:create", extra: { disputeId: dispute._id, rideId } });
      return res.status(201).json({ dispute: populated });
    } catch (e) {
      next(e);
    }
  },
);

// ─── User: list my disputes ─────────────────────────────────────────────────

router.get("/mine", async (req, res, next) => {
  try {
    const { limit, page, skip } = parsePagination(req);
    const uid = String(req.userId);
    const filter = { $or: [{ initiatorId: uid }, { respondentId: uid }] };
    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("rideId", "status pickupLocation destinationLocation")
        .lean(),
      Dispute.countDocuments(filter),
    ]);
    return res.json({ disputes, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});

// ─── User: get dispute messages ─────────────────────────────────────────────

router.get("/:id/messages", docIdParam("id"), async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id).lean();
    if (!dispute) throw new AppError("Not found", 404);
    const uid = String(req.userId);
    const isAdmin = req.userRole === "admin";
    if (!isAdmin && String(dispute.initiatorId) !== uid && String(dispute.respondentId) !== uid) {
      throw new AppError("Forbidden", 403);
    }
    const messages = await Message.find({ disputeId: req.params.id })
      .sort({ createdAt: 1 })
      .populate("senderId", "name role")
      .lean();
    return res.json({ messages });
  } catch (e) {
    next(e);
  }
});

// ─── User: send message on dispute ─────────────────────────────────────────

router.post(
  "/:id/messages",
  docIdParam("id"),
  body("text").trim().notEmpty().isLength({ max: 2000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const dispute = await Dispute.findById(req.params.id);
      if (!dispute) throw new AppError("Not found", 404);
      const uid = String(req.userId);
      const isAdmin = req.userRole === "admin";
      if (!isAdmin && String(dispute.initiatorId) !== uid && String(dispute.respondentId) !== uid) {
        throw new AppError("Forbidden", 403);
      }
      if (dispute.status === "resolved" || dispute.status === "dismissed") {
        throw new AppError("Dispute is closed", 400);
      }
      const msg = await Message.create({
        disputeId: req.params.id,
        senderId: req.userId,
        text: String(req.body.text).trim(),
        type: "dispute",
      });
      const populated = await Message.findById(msg._id).populate("senderId", "name role").lean();
      logAction({ req, action: "Dispute message sent", file: "routes/disputes.js:message", extra: { disputeId: req.params.id } });
      return res.status(201).json({ message: populated });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Admin: list all disputes ──────────────────────────────────────────────

router.get("/admin", roleRequired("admin"), fixedAdminOnly, async (req, res, next) => {
  try {
    const { limit, page, skip } = parsePagination(req);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("initiatorId", "name email role")
        .populate("respondentId", "name email role")
        .populate("rideId", "status pickupLocation destinationLocation estimatedFare")
        .lean(),
      Dispute.countDocuments(filter),
    ]);
    return res.json({ disputes, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
});

// ─── Admin: get dispute detail ─────────────────────────────────────────────

router.get("/admin/:id", roleRequired("admin"), fixedAdminOnly, docIdParam("id"), async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate("initiatorId", "name email role")
      .populate("respondentId", "name email role")
      .populate("rideId")
      .populate("assignedAdminId", "name email")
      .lean();
    if (!dispute) throw new AppError("Not found", 404);
    const messages = await Message.find({ disputeId: req.params.id })
      .sort({ createdAt: 1 })
      .populate("senderId", "name role")
      .lean();
    return res.json({ dispute, messages });
  } catch (e) {
    next(e);
  }
});

// ─── Admin: update dispute status ─────────────────────────────────────────

router.put(
  "/admin/:id/status",
  roleRequired("admin"),
  fixedAdminOnly,
  docIdParam("id"),
  body("status").isIn(["open", "reviewing", "resolved", "dismissed"]),
  body("note").optional().isString().isLength({ max: 1000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const dispute = await Dispute.findById(req.params.id);
      if (!dispute) throw new AppError("Not found", 404);
      dispute.status = req.body.status;
      if (req.body.note) dispute.adminNote = String(req.body.note).trim();
      dispute.assignedAdminId = req.userId;
      dispute.resolvedAt = req.body.status === "resolved" || req.body.status === "dismissed" ? new Date() : dispute.resolvedAt;
      await dispute.save();
      const populated = await Dispute.findById(dispute._id)
        .populate("initiatorId", "name email role")
        .populate("respondentId", "name email role")
        .lean();
      logAction({
        req,
        action: "Dispute status updated",
        file: "routes/disputes.js:status",
        extra: { disputeId: req.params.id, status: req.body.status },
      });
      return res.json({ dispute: populated });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
