import { Router } from "express";
import { body } from "express-validator";
import { Report } from "../models/Report.js";
import { User } from "../models/User.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";

const router = Router();

router.use(authRequired, blockCheck);

router.post(
  "/",
  body("reportedUserId").isMongoId(),
  body("reason").trim().notEmpty().isLength({ max: 120 }),
  body("description").trim().notEmpty().isLength({ max: 2000 }),
  body("rideId").optional().isMongoId(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { reportedUserId, reason, description, rideId } = req.body;
      if (String(reportedUserId) === String(req.userId)) {
        throw new AppError("Cannot report yourself", 400);
      }
      const target = await User.findById(reportedUserId);
      if (!target) throw new AppError("User not found", 404);
      const report = await Report.create({
        reporterId: req.userId,
        reportedUserId,
        reason: String(reason).trim(),
        description: String(description).trim(),
        rideId: rideId || null,
      });
      const populated = await Report.findById(report._id)
        .populate("reporterId", "name email role")
        .populate("reportedUserId", "name email role")
        .lean();
      return res.status(201).json({ report: populated });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
