import { Router } from "express";
import { body, param } from "express-validator";
import { SavedPlace } from "../models/SavedPlace.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { logAction } from "../utils/logger.js";

const router = Router();
router.use(authRequired, blockCheck);

router.get("/", async (req, res, next) => {
  try {
    const places = await SavedPlace.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: places });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/",
  body("name").trim().notEmpty().isLength({ max: 60 }),
  body("address").trim().notEmpty().isLength({ max: 300 }),
  body("lat").isFloat({ min: -90, max: 90 }),
  body("lng").isFloat({ min: -180, max: 180 }),
  body("icon").optional().isString().isLength({ max: 30 }),
  body("isDefault").optional().isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { name, address, lat, lng, icon, isDefault } = req.body;
      if (isDefault) {
        await SavedPlace.updateOne({ userId: req.userId }, { $set: { isDefault: false } });
      }
      const place = await SavedPlace.create({
        userId: req.userId,
        name: String(name).trim(),
        address: String(address).trim(),
        lat: Number(lat),
        lng: Number(lng),
        icon: String(icon || "").trim() || null,
        isDefault: Boolean(isDefault),
      });
      logAction({ req, action: "SAVED_PLACE_CREATE", extra: { placeId: place._id, name } });
      return res.status(201).json({ success: true, data: place });
    } catch (e) {
      next(e);
    }
  },
);

router.put(
  "/:id",
  param("id").isString(),
  body("name").optional().trim().isLength({ max: 60 }),
  body("address").optional().trim().isLength({ max: 300 }),
  body("lat").optional().isFloat({ min: -90, max: 90 }),
  body("lng").optional().isFloat({ min: -180, max: 180 }),
  body("icon").optional().isString().isLength({ max: 30 }),
  body("isDefault").optional().isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const place = await SavedPlace.findById(req.params.id);
      if (!place || String(place.userId) !== String(req.userId)) {
        throw new AppError("Place not found", 404);
      }
      const { name, address, lat, lng, icon, isDefault } = req.body;
      if (isDefault) {
        await SavedPlace.updateOne({ userId: req.userId }, { $set: { isDefault: false } });
      }
      const updates = {};
      if (name !== undefined) updates.name = String(name).trim();
      if (address !== undefined) updates.address = String(address).trim();
      if (lat !== undefined) updates.lat = Number(lat);
      if (lng !== undefined) updates.lng = Number(lng);
      if (icon !== undefined) updates.icon = String(icon).trim() || null;
      if (isDefault !== undefined) updates.isDefault = Boolean(isDefault);
      await SavedPlace.updateOne({ _id: req.params.id }, { $set: updates });
      const updated = await SavedPlace.findById(req.params.id);
      logAction({ req, action: "SAVED_PLACE_UPDATE", extra: { placeId: req.params.id } });
      return res.json({ success: true, data: updated });
    } catch (e) {
      next(e);
    }
  },
);

router.delete("/:id", param("id").isString(), validateRequest, async (req, res, next) => {
  try {
    const place = await SavedPlace.findById(req.params.id);
    if (!place || String(place.userId) !== String(req.userId)) {
      throw new AppError("Place not found", 404);
    }
    await SavedPlace.deleteOne({ _id: req.params.id });
    logAction({ req, action: "SAVED_PLACE_DELETE", extra: { placeId: req.params.id } });
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.put("/:id/default", param("id").isString(), validateRequest, async (req, res, next) => {
  try {
    const place = await SavedPlace.findById(req.params.id);
    if (!place || String(place.userId) !== String(req.userId)) {
      throw new AppError("Place not found", 404);
    }
    await SavedPlace.updateOne({ userId: req.userId }, { $set: { isDefault: false } });
      await SavedPlace.updateOne({ _id: req.params.id }, { $set: { isDefault: true } });
    logAction({ req, action: "SAVED_PLACE_DEFAULT", extra: { placeId: req.params.id } });
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
