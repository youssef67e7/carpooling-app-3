import { User } from "../models/User.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { AppError } from "../errors/AppError.js";

/**
 * Enforce that the current user is an APPROVED driver with an ACTIVE car selected.
 * Use this for driver actions that affect passengers / ride lifecycle.
 *
 * Note: caller should already have `authRequired` + `blockCheck` + `roleRequired("driver")`.
 */
export async function requireApprovedDriver(req, _res, next) {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) throw new AppError("User not found", 401);
    if (user.role === "admin") throw new AppError("Forbidden", 403);
    const mode = user.active_role || user.role || "passenger";
    if (mode !== "driver") throw new AppError("Forbidden", 403);

    const prof = await DriverProfile.findOne({ userId: req.userId }).lean();
    const approved = user.driver_application_status === "approved" && prof?.status === "approved";
    if (!approved) throw new AppError("Driver registration pending approval", 403);

    const sel = prof?.selectedCarId ? String(prof.selectedCarId) : null;
    const okCar = !!sel && Array.isArray(prof?.cars) && prof.cars.some((c) => String(c?._id) === sel);
    if (!okCar) throw new AppError("Select an active vehicle before continuing", 400);

    return next();
  } catch (e) {
    return next(e);
  }
}

