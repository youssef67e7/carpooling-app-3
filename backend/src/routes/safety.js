import crypto from "crypto";
import { Router } from "express";
import { body, param } from "express-validator";
import { ObjectId } from "mongodb";
import { User } from "../models/User.js";
import { SafetyEvent } from "../models/SafetyEvent.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { logAction } from "../utils/logger.js";

const router = Router();
router.use(authRequired, blockCheck);

router.post(
  "/emergency",
  body("rideId").optional().isString(),
  body("location").optional().isObject(),
  body("message").optional().isString().isLength({ max: 500 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const event = await SafetyEvent.create({
        userId: req.userId,
        type: "sos",
        rideId: req.body.rideId || null,
        location: req.body.location || null,
        message:
          String(req.body.message || "")
            .trim()
            .slice(0, 500) || null,
        status: "active",
      });
      logAction({ req, action: "SOS_EMERGENCY", extra: { eventId: event._id, rideId: req.body.rideId } });
      return res.status(201).json({ success: true, data: { eventId: event._id } });
    } catch (e) {
      next(e);
    }
  },
);

router.post("/emergency/:eventId/resolve", param("eventId").isString(), validateRequest, async (req, res, next) => {
  try {
    const event = await SafetyEvent.findById(req.params.eventId);
    if (!event || String(event.userId) !== String(req.userId)) {
      throw new AppError("Event not found", 404);
    }
    event.status = "resolved";
    event.resolvedAt = new Date();
    await event.save();
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.get("/trusted-contacts", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("trustedContacts").lean();
    return res.json({ success: true, data: user?.trustedContacts || [] });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/trusted-contacts",
  body("name").trim().notEmpty().isLength({ max: 100 }),
  body("phone").trim().notEmpty().isLength({ max: 20 }),
  body("relation").optional().isString().isLength({ max: 50 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const contact = {
        _id: new ObjectId(),
        name: String(req.body.name).trim(),
        phone: String(req.body.phone).trim(),
        relation:
          String(req.body.relation || "")
            .trim()
            .slice(0, 50) || null,
        createdAt: new Date(),
      };
      await User.updateOne({ _id: req.userId }, { $push: { trustedContacts: contact } });
      return res.status(201).json({ success: true, data: contact });
    } catch (e) {
      next(e);
    }
  },
);

router.delete("/trusted-contacts/:contactId", param("contactId").isString(), validateRequest, async (req, res, next) => {
  try {
    const result = await User.updateOne(
      { _id: req.userId },
      { $pull: { trustedContacts: { _id: new ObjectId(req.params.contactId) } } },
    );
    if (result.modifiedCount === 0) throw new AppError("Contact not found", 404);
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post("/block/:userId", param("userId").isString(), validateRequest, async (req, res, next) => {
  try {
    const targetId = String(req.params.userId);
    if (targetId === String(req.userId)) throw new AppError("Cannot block yourself", 400);
    const target = await User.findById(targetId);
    if (!target) throw new AppError("User not found", 404);
    const me = await User.findById(req.userId);
    if (!me) throw new AppError("User not found", 404);
    const blocked = me.blockedUsers || [];
    if (blocked.some((b) => String(b.userId) === targetId)) {
      return res.json({ success: true, message: "Already blocked" });
    }
    blocked.push({ userId: new ObjectId(targetId), blockedAt: new Date() });
    await User.updateOne({ _id: req.userId }, { $set: { blockedUsers: blocked } });
    logAction({ req, action: "BLOCK_USER", extra: { targetId } });
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/block/:userId", param("userId").isString(), validateRequest, async (req, res, next) => {
  try {
    const targetId = String(req.params.userId);
    const me = await User.findById(req.userId);
    if (!me) throw new AppError("User not found", 404);
    const blocked = (me.blockedUsers || []).filter((b) => String(b.userId) !== targetId);
    await User.updateOne({ _id: req.userId }, { $set: { blockedUsers: blocked } });
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.get("/blocked", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("blockedUsers").lean();
    const blocked = user?.blockedUsers || [];
    const ids = blocked.map((b) => b.userId).filter(Boolean);
    const users =
      ids.length > 0
        ? await User.find({ _id: { $in: ids } })
            .select("name email role profileImageUrl")
            .lean()
        : [];
    const data = blocked.map((b) => {
      const u = users.find((x) => String(x._id) === String(b.userId));
      return { userId: b.userId, blockedAt: b.blockedAt, user: u || null };
    });
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.post("/share-trip/:rideId", param("rideId").isString(), validateRequest, async (req, res, next) => {
  try {
    const shareToken = crypto.randomUUID();
    await User.updateOne(
      { _id: req.userId },
      { $set: { [`shareTokens.${req.params.rideId}`]: { token: shareToken, createdAt: new Date() } } },
    );
    const baseUrl = process.env.BASE_URL || "https://carpooling-app-3-virid.vercel.app";
    const link = `${baseUrl}/share-trip/${shareToken}`;
    return res.json({ success: true, data: { link, token: shareToken } });
  } catch (e) {
    next(e);
  }
});

router.get("/share-trip/:token", async (req, res, next) => {
  try {
    const user = await User.findOne({ [`shareTokens.${req.params.rideId}`]: { $exists: true } })
      .select("shareTokens")
      .lean();
    if (!user) throw new AppError("Share link not found", 404);
    return res.json({ success: true, data: { rideId: req.params.rideId } });
  } catch (e) {
    next(e);
  }
});

export default router;
