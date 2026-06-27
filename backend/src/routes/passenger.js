import { Router } from "express";
import { body } from "express-validator";
import { User } from "../models/User.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { validate } from "../middleware/validate.js";
import { locationLimiter } from "../middleware/rateLimiters.js";
import { AppError } from "../errors/AppError.js";
import { driverLocationSchema } from "../schemas/driver.schemas.js";
import { haversineKm } from "../utils/geo.js";

const router = Router();

router.use(authRequired, blockCheck, roleRequired("passenger"));

router.post(
  "/location-update",
  locationLimiter,
  validate(driverLocationSchema),
  body("lat").isFloat({ min: -90, max: 90 }),
  body("lng").isFloat({ min: -180, max: 180 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { lat, lng } = req.body;
      const user = await User.findById(req.userId);
      if (!user) throw new AppError("Not found", 404);
      const existing = user.location;
      const newLat = Number(lat);
      const newLng = Number(lng);
      if (
        existing &&
        Number.isFinite(existing.lat) &&
        Number.isFinite(existing.lng) &&
        haversineKm(existing.lat, existing.lng, newLat, newLng) * 1000 < 10
      ) {
        return res.json({ location: { lat: newLat, lng: newLng } });
      }
      user.location = { lat: newLat, lng: newLng };
      await user.save();
      return res.json({ location: user.location });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
