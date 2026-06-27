import { Router } from "express";
import { body } from "express-validator";
import { NotificationPref } from "../models/NotificationPref.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { logAction } from "../utils/logger.js";

const router = Router();
router.use(authRequired, blockCheck);

router.get("/notifications", async (req, res, next) => {
  try {
    let prefs = await NotificationPref.findOne({ userId: req.userId });
    if (!prefs) {
      prefs = await NotificationPref.create({
        userId: req.userId,
        tripUpdates: true,
        promotions: false,
        driverApproval: true,
        payments: true,
        chat: true,
        email: true,
        sms: false,
      });
    }
    return res.json({ success: true, data: prefs });
  } catch (e) {
    next(e);
  }
});

router.put(
  "/notifications",
  body("tripUpdates").optional().isBoolean(),
  body("promotions").optional().isBoolean(),
  body("driverApproval").optional().isBoolean(),
  body("payments").optional().isBoolean(),
  body("chat").optional().isBoolean(),
  body("email").optional().isBoolean(),
  body("sms").optional().isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const allowed = ["tripUpdates", "promotions", "driverApproval", "payments", "chat", "email", "sms"];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = Boolean(req.body[key]);
      }
      await NotificationPref.updateOne({ userId: req.userId }, { $set: updates }, { upsert: true });
      const prefs = await NotificationPref.findOne({ userId: req.userId });
      logAction({ req, action: "NOTIFICATION_PREFS_UPDATE", extra: { updates: Object.keys(updates) } });
      return res.json({ success: true, data: prefs });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
