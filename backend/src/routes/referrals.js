import crypto from "crypto";
import { Router } from "express";
import { body, param } from "express-validator";
import { ObjectId } from "mongodb";
import { Referral } from "../models/Referral.js";
import { User } from "../models/User.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { logAction } from "../utils/logger.js";

const router = Router();
router.use(authRequired, blockCheck);

function generateCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

router.get("/my-code", async (req, res, next) => {
  try {
    let ref = await Referral.findOne({ userId: req.userId });
    if (!ref) {
      let code = generateCode();
      while (await Referral.findOne({ code })) {
        code = generateCode();
      }
      ref = await Referral.create({
        userId: req.userId,
        code,
        rewards: 0,
        referredUsers: [],
      });
    }
    return res.json({ success: true, data: ref });
  } catch (e) {
    next(e);
  }
});

router.get("/rewards", async (req, res, next) => {
  try {
    const ref = await Referral.findOne({ userId: req.userId });
    return res.json({ success: true, data: { rewards: ref?.rewards || 0, referredUsers: ref?.referredUsers || [] } });
  } catch (e) {
    next(e);
  }
});

router.post("/apply", body("code").trim().notEmpty().isLength({ max: 10 }), validateRequest, async (req, res, next) => {
  try {
    const code = String(req.body.code).trim().toUpperCase();
    const ref = await Referral.findOne({ code });
    if (!ref) throw new AppError("Invalid referral code", 404);
    if (String(ref.userId) === String(req.userId)) throw new AppError("Cannot use your own referral code", 400);
    const existing = await Referral.findOne({ referredUserId: req.userId });
    if (existing) throw new AppError("Referral already applied for this account", 400);
    const user = await User.findById(req.userId).select("name").lean();
    const referrer = await User.findById(ref.userId).select("name").lean();
    await Referral.updateOne(
      { _id: ref._id },
      {
        $push: {
          referredUsers: { userId: req.userId, name: user?.name || "User", appliedAt: new Date() },
        },
        $inc: { rewards: 1 },
      },
    );
    await Referral.create({
      userId: req.userId,
      code: null,
      referredBy: ref.userId,
      rewards: 0,
      referredUsers: [],
    });
    logAction({ req, action: "REFERRAL_APPLIED", extra: { code, referrerId: ref.userId } });
    return res.json({ success: true, data: { referrerName: referrer?.name || "a friend" } });
  } catch (e) {
    next(e);
  }
});

export default router;
