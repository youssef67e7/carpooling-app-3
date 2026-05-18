import { Router } from "express";
import { body } from "express-validator";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { User } from "../models/User.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { DriverDocuments } from "../models/DriverDocuments.js";
import { signUserToken } from "../utils/signUserToken.js";

const router = Router();

router.use(authRequired, blockCheck);

function normRole(raw) {
  const r = String(raw || "").trim().toLowerCase();
  return r === "driver" ? "driver" : r === "passenger" ? "passenger" : null;
}

router.post(
  "/switch-role",
  body("role").isIn(["passenger", "driver"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const target = normRole(req.body.role);
      const user = await User.findById(req.userId);
      if (!user) throw new AppError("User not found", 401);
      if (user.role === "admin") throw new AppError("Admins cannot switch roles", 403);

      if (target === "driver") {
        const prof = await DriverProfile.findOne({ userId: user._id }).lean();
        const hasDriverProfile = !!prof;
        const hasApplied = (user.driver_application_status || "none") !== "none";
        if (!hasDriverProfile && !hasApplied) {
          return res.status(400).json({
            message: "Driver profile not found. Apply first.",
            driver_application_status: user.driver_application_status || "none",
            driver_profile_status: "none",
          });
        }
        user.active_role = "driver";
      } else {
        user.active_role = "passenger";
        // Safety: if they were driving, going passenger should not keep them online as driver.
        user.isOnline = false;
      }

      await user.save();
      const token = signUserToken(user);
      return res.json({ ok: true, token, user: user.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/driver-status", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new AppError("User not found", 401);
    if (user.role === "admin") throw new AppError("Admins have no driver profile", 400);

    const prof = await DriverProfile.findOne({ userId: user._id }).lean();
    const status = user.driver_application_status || "none";
    const profileStatus = prof?.status || "none";
    const canSwitchToDriver = status !== "none" || profileStatus !== "none";
    return res.json({
      status,
      profileStatus,
      canSwitchToDriver,
      activeRole: user.active_role || user.role,
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/become-driver",
  body("profileImageUrl").optional({ checkFalsy: true }).isString().trim().isLength({ min: 4, max: 500 }),
  body("criminalRecordFrontUrl").optional({ checkFalsy: true }).isString().trim().isLength({ min: 4, max: 500 }),
  body("criminalRecordBackUrl").optional({ checkFalsy: true }).isString().trim().isLength({ min: 4, max: 500 }),
  body("nationalIdNumber").optional({ checkFalsy: true }).isString().trim().isLength({ min: 6, max: 32 }),
  body("licenseImageUrl").optional({ checkFalsy: true }).isString().trim().isLength({ min: 4, max: 500 }),
  body("licenseNumber").optional({ checkFalsy: true }).isString().trim().isLength({ min: 3, max: 64 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) throw new AppError("User not found", 401);
      if (user.role === "admin") throw new AppError("Admins cannot apply as drivers", 403);

      // If already approved, no need to re-apply.
      if (user.driver_application_status === "approved") {
        const prof = await DriverProfile.findOne({ userId: user._id }).lean();
        return res.json({ ok: true, status: "approved", profileStatus: prof?.status || "approved" });
      }

      // Create stubs (actual document upload still handled via /upload + onboarding flow).
      if (req.body.profileImageUrl) {
        user.profileImageUrl = String(req.body.profileImageUrl).trim().slice(0, 500);
      }
      user.driver_application_status = "pending";
      await user.save();

      await DriverProfile.updateOne(
        { userId: user._id },
        { $set: { userId: user._id, status: "pending" } },
        { upsert: true }
      );

      const docSet = {};
      for (const k of ["criminalRecordFrontUrl", "criminalRecordBackUrl", "nationalIdNumber"]) {
        if (req.body[k]) docSet[k] = String(req.body[k]).trim().slice(0, 500);
      }
      if (Object.keys(docSet).length) {
        await DriverDocuments.updateOne(
          { userId: user._id },
          { $set: { userId: user._id, ...docSet } },
          { upsert: true }
        );
      }

      return res.status(201).json({ ok: true, status: "pending" });
    } catch (e) {
      next(e);
    }
  }
);

export default router;

