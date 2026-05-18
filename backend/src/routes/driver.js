import { Router } from "express";
import { body } from "express-validator";
import { User } from "../models/User.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { requireApprovedDriver } from "../middleware/driverGate.js";

const router = Router();

router.use(authRequired, blockCheck);

function assertNotAdmin(user) {
  if (user?.role === "admin") throw new AppError("Forbidden", 403);
}

async function requireDriverProfile(userId) {
  const prof = await DriverProfile.findOne({ userId });
  if (!prof) throw new AppError("Driver profile not found", 404);
  return prof;
}

function isOwnedUploadUrl(userId, raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (s.startsWith("http://") || s.startsWith("https://")) return true;
  return s.startsWith(`/uploads/public/${String(userId)}/`) || s.startsWith(`/uploads/private/${String(userId)}/`);
}

router.get("/status", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) throw new AppError("Not found", 404);
    assertNotAdmin(user);
    const prof = await DriverProfile.findOne({ userId: req.userId }).lean();
    return res.json({
      applicationStatus: user.driver_application_status || "none",
      profileStatus: prof?.status || "none",
      reviewNote: prof?.reviewNote || "",
      selectedCarId: prof?.selectedCarId || null,
      carsCount: Array.isArray(prof?.cars) ? prof.cars.length : 0,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/toggle-status", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new AppError("Not found", 404);
    assertNotAdmin(user);
    const mode = user.active_role || user.role || "passenger";
    if (mode !== "driver") throw new AppError("Forbidden", 403);
    const goingOnline = !user.isOnline;
    if (goingOnline) {
      const prof = await DriverProfile.findOne({ userId: req.userId }).lean();
      const approved = user.driver_application_status === "approved" && prof?.status === "approved";
      if (!approved) throw new AppError("Driver registration pending approval", 403);
      const sel = prof?.selectedCarId ? String(prof.selectedCarId) : null;
      const okCar = !!sel && Array.isArray(prof?.cars) && prof.cars.some((c) => String(c?._id) === sel);
      if (!okCar) throw new AppError("Select an active vehicle before going online", 400);
    }
    user.isOnline = goingOnline;
    await user.save();
    return res.json({ isOnline: user.isOnline, user: user.toJSON() });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/cars",
  body("imageUrl").isString().trim().isLength({ min: 4, max: 500 }),
  body("brand").isString().trim().isLength({ min: 1, max: 80 }),
  body("model").isString().trim().isLength({ min: 1, max: 80 }),
  body("color").isString().trim().isLength({ min: 1, max: 40 }),
  body("plateNumber").isString().trim().isLength({ min: 1, max: 24 }),
  body("seats").isInt({ min: 2, max: 20 }).toInt(),
  body("carCategory").optional().isIn(["sedan", "suv", "van"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.userId).lean();
      if (!user) throw new AppError("Not found", 404);
      assertNotAdmin(user);
      const prof = await requireDriverProfile(req.userId);
      const car = {
        imageUrl: String(req.body.imageUrl).trim().slice(0, 500),
        brand: String(req.body.brand).trim().slice(0, 80),
        model: String(req.body.model).trim().slice(0, 80),
        color: String(req.body.color).trim().slice(0, 40),
        plateNumber: String(req.body.plateNumber).trim().slice(0, 24),
        seats: Number(req.body.seats),
        carCategory: String(req.body.carCategory || "sedan").toLowerCase(),
      };
      if (!isOwnedUploadUrl(req.userId, car.imageUrl)) throw new AppError("Invalid image URL", 400);
      prof.cars.push(car);
      if (!prof.selectedCarId && prof.cars[0]?._id) prof.selectedCarId = prof.cars[0]._id;
      await prof.save();
      return res.status(201).json({ profile: prof.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/cars/:carId",
  body("imageUrl").optional().isString().trim().isLength({ min: 4, max: 500 }),
  body("brand").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("model").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("color").optional().isString().trim().isLength({ min: 1, max: 40 }),
  body("plateNumber").optional().isString().trim().isLength({ min: 1, max: 24 }),
  body("seats").optional().isInt({ min: 2, max: 20 }).toInt(),
  body("carCategory").optional().isIn(["sedan", "suv", "van"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.userId).lean();
      if (!user) throw new AppError("Not found", 404);
      assertNotAdmin(user);
      const prof = await requireDriverProfile(req.userId);
      const car = prof.cars.id(req.params.carId);
      if (!car) throw new AppError("Car not found", 404);
      for (const k of ["imageUrl", "brand", "model", "color", "plateNumber"]) {
        if (req.body[k] != null) car[k] = String(req.body[k]).trim();
      }
      if (req.body.imageUrl != null && !isOwnedUploadUrl(req.userId, car.imageUrl)) throw new AppError("Invalid image URL", 400);
      if (req.body.seats != null) car.seats = Number(req.body.seats);
      if (req.body.carCategory != null) car.carCategory = String(req.body.carCategory).toLowerCase();
      await prof.save();
      return res.json({ profile: prof.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/cars/:carId", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) throw new AppError("Not found", 404);
    assertNotAdmin(user);
    const prof = await DriverProfile.findOne({ userId: req.userId });
    if (!prof) throw new AppError("Driver profile not found", 404);
    const carId = String(req.params.carId);
    if (user?.isOnline && prof.selectedCarId && String(prof.selectedCarId) === carId) {
      throw new AppError("Cannot remove active vehicle while online", 400);
    }
    const car = prof.cars.id(carId);
    if (!car) throw new AppError("Car not found", 404);
    car.deleteOne();
    if (prof.selectedCarId && String(prof.selectedCarId) === carId) {
      prof.selectedCarId = prof.cars[0]?._id || null;
    }
    await prof.save();
    return res.json({ ok: true, profile: prof.toJSON() });
  } catch (e) {
    next(e);
  }
});

router.patch("/cars/:carId/set-active", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) throw new AppError("Not found", 404);
    assertNotAdmin(user);
    const prof = await requireDriverProfile(req.userId);
    const carId = String(req.params.carId);
    const exists = prof.cars.some((c) => String(c?._id) === carId);
    if (!exists) throw new AppError("Car not found", 404);
    prof.selectedCarId = carId;
    await prof.save();
    return res.json({ ok: true, profile: prof.toJSON() });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/location-update",
  requireApprovedDriver,
  body("lat").isFloat({ min: -90, max: 90 }),
  body("lng").isFloat({ min: -180, max: 180 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { lat, lng } = req.body;
      const user = await User.findById(req.userId);
      if (!user) throw new AppError("Not found", 404);
      assertNotAdmin(user);
      user.location = { lat: Number(lat), lng: Number(lng) };
      await user.save();
      return res.json({ location: user.location });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
