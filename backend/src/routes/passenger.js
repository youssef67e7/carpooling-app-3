import { Router } from "express";
import { body } from "express-validator";
import { User } from "../models/User.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";

const router = Router();

router.use(authRequired, blockCheck, roleRequired("passenger"));

router.post(
  "/location-update",
  body("lat").isFloat({ min: -90, max: 90 }),
  body("lng").isFloat({ min: -180, max: 180 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { lat, lng } = req.body;
      const user = await User.findById(req.userId);
      if (!user) throw new AppError("Not found", 404);
      user.location = { lat: Number(lat), lng: Number(lng) };
      await user.save();
      return res.json({ location: user.location });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
