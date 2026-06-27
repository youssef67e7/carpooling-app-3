import { Router } from "express";
import { body, param } from "express-validator";
import { ObjectId } from "mongodb";
import { Promotion } from "../models/Promotion.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { logAction } from "../utils/logger.js";

const router = Router();
router.use(authRequired, blockCheck);

router.get("/active", async (req, res, next) => {
  try {
    const now = new Date();
    const promos = await Promotion.find({
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: promos });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/validate",
  body("code").trim().notEmpty().isLength({ max: 50 }),
  body("rideFare").optional().isFloat({ min: 0 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const code = String(req.body.code).trim().toUpperCase();
      const promo = await Promotion.findOne({ code, isActive: true });
      if (!promo) throw new AppError("Invalid or expired promo code", 404);
      const now = new Date();
      if (promo.expiresAt && new Date(promo.expiresAt) < now) throw new AppError("Promo code has expired", 400);
      if (promo.startsAt && new Date(promo.startsAt) > now) throw new AppError("Promo code is not yet active", 400);
      if (promo.maxUses && promo.currentUses >= promo.maxUses) throw new AppError("Promo code has reached max uses", 400);
      const rideFare = Number(req.body.rideFare) || 0;
      if (promo.minRideFare && rideFare < promo.minRideFare) throw new AppError("Ride fare is below minimum for this promo", 400);
      let discount = 0;
      if (promo.discountType === "percentage") {
        discount = Math.round(rideFare * (promo.discountValue / 100) * 100) / 100;
        if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
      } else {
        discount = Math.min(promo.discountValue, rideFare);
      }
      return res.json({ success: true, data: { promo, discount } });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/apply/:id",
  param("id").isString(),
  body("rideFare").isFloat({ min: 0 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const now = new Date();
      const updated = await Promotion.findOneAndUpdate(
        {
          _id: req.params.id,
          isActive: true,
          expiresAt: { $gte: now },
          startsAt: { $lte: now },
          $expr: {
            $or: [
              { $eq: ["$max_uses", null] },
              { $lt: ["$current_uses", "$max_uses"] },
            ],
          },
        },
        { $inc: { currentUses: 1 } },
        { returnDocument: "after" },
      );
      if (!updated) throw new AppError("Promo not found or expired or max uses reached", 400);
      const rideFare = Number(req.body.rideFare);
      let discount = 0;
      if (updated.discountType === "percentage") {
        discount = Math.round(rideFare * (updated.discountValue / 100) * 100) / 100;
        if (updated.maxDiscount) discount = Math.min(discount, updated.maxDiscount);
      } else {
        discount = Math.min(updated.discountValue, rideFare);
      }
      logAction({ req, action: "PROMO_APPLIED", extra: { promoId: req.params.id, code: updated.code, discount } });
      return res.json({ success: true, data: { discount, finalFare: Math.round((rideFare - discount) * 100) / 100 } });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/create",
  roleRequired("admin"),
  body("code").trim().notEmpty().isLength({ max: 50 }),
  body("title").trim().notEmpty().isLength({ max: 100 }),
  body("description").optional().isString().isLength({ max: 500 }),
  body("discountType").isIn(["percentage", "fixed"]),
  body("discountValue").isFloat({ min: 0 }),
  body("maxDiscount").optional().isFloat({ min: 0 }),
  body("minRideFare").optional().isFloat({ min: 0 }),
  body("maxUses").optional().isInt({ min: 1 }),
  body("expiresAt").isString(),
  body("startsAt").optional().isString(),
  validateRequest,
  async (req, res, next) => {
    try {
      const existing = await Promotion.findOne({ code: String(req.body.code).trim().toUpperCase() });
      if (existing) throw new AppError("Promo code already exists", 409);
      const promo = await Promotion.create({
        code: String(req.body.code).trim().toUpperCase(),
        title: String(req.body.title).trim(),
        description: String(req.body.description || "").trim() || null,
        discountType: req.body.discountType,
        discountValue: Number(req.body.discountValue),
        maxDiscount: req.body.maxDiscount ? Number(req.body.maxDiscount) : null,
        minRideFare: req.body.minRideFare ? Number(req.body.minRideFare) : null,
        maxUses: req.body.maxUses ? Number(req.body.maxUses) : null,
        currentUses: 0,
        startsAt: req.body.startsAt ? new Date(req.body.startsAt) : new Date(),
        expiresAt: new Date(req.body.expiresAt),
        isActive: true,
        createdBy: req.userId,
      });
      logAction({ req, action: "PROMO_CREATED", extra: { code: promo.code, id: promo._id } });
      return res.status(201).json({ success: true, data: promo });
    } catch (e) {
      next(e);
    }
  },
);

router.get("/admin", roleRequired("admin"), async (req, res, next) => {
  try {
    const promos = await Promotion.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: promos });
  } catch (e) {
    next(e);
  }
});

router.put("/admin/:id/toggle", roleRequired("admin"), param("id").isString(), validateRequest, async (req, res, next) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) throw new AppError("Promo not found", 404);
    await Promotion.updateOne({ _id: req.params.id }, { $set: { isActive: !promo.isActive } });
    logAction({ req, action: "PROMO_TOGGLED", extra: { id: req.params.id, wasActive: promo.isActive } });
    return res.json({ success: true, data: { isActive: !promo.isActive } });
  } catch (e) {
    next(e);
  }
});

export default router;
