import { Router } from "express";
import { body } from "express-validator";
import { User } from "../models/User.js";
import { Ride } from "../models/Ride.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../errors/AppError.js";
import { newDocId } from "../mongo/odm.js";
import { requireApprovedDriver } from "../middleware/driverGate.js";
import { driverLocationSchema } from "../schemas/driver.schemas.js";
import { getDriverDashboard } from "../services/driverDashboard.js";
import { logAction } from "../utils/logger.js";

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
    const cars = Array.isArray(prof?.cars) ? prof.cars : [];
    return res.json({
      applicationStatus: user.driver_application_status || "none",
      profileStatus: prof?.status || "none",
      reviewNote: prof?.reviewNote || "",
      selectedCarId: prof?.selectedCarId || null,
      carsCount: cars.length,
      cars,
      rating: prof?.rating ?? null,
      ratingCount: prof?.ratingCount ?? 0,
    });
  } catch (e) {
    next(e);
  }
});

/** Full driver dashboard — MongoDB: users, driver_profiles, wallet, rides, transactions. */
router.get("/dashboard", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) throw new AppError("Not found", 404);
    assertNotAdmin(user);
    const dashboard = await getDriverDashboard(req.userId);
    if (!dashboard) throw new AppError("Not found", 404);
    return res.json(dashboard);
  } catch (e) {
    next(e);
  }
});

router.get("/earnings-summary", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    const prof = await DriverProfile.findOne({ userId: req.userId }).lean();
    const approved = user?.driver_application_status === "approved" && prof?.status === "approved";
    if (!approved) {
      return res.json({
        completedTrips: 0,
        totalEarnings: 0,
        averageRating: prof?.rating ?? null,
        ratedTrips: prof?.ratingCount ?? 0,
        activeTrips: 0,
        sessionEarnings: 0,
      });
    }
    const rides = await Ride.find({ driverId: req.userId, status: "completed" })
      .sort({ completedAt: -1, updatedAt: -1 })
      .limit(500)
      .lean();
    let totalEarnings = 0;
    let rated = 0;
    let ratingSum = 0;
    for (const r of rides) {
      totalEarnings += Number(r.agreedFare ?? r.estimatedFare ?? 0) || 0;
      if (r.passengerRating != null) {
        rated += 1;
        ratingSum += Number(r.passengerRating) || 0;
      }
    }
    const activeCount = await Ride.countDocuments({
      driverId: req.userId,
      status: { $in: ["accepted", "ongoing"] },
    });
    return res.json({
      completedTrips: rides.length,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      averageRating: rated ? Math.round((ratingSum / rated) * 10) / 10 : null,
      ratedTrips: rated,
      activeTrips: activeCount,
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
    logAction({ req, action: `Driver ${goingOnline ? "online" : "offline"}`, file: "routes/driver.js:toggle_status" });
    return res.json({ isOnline: user.isOnline, user: user.toJSON() });
  } catch (e) {
    logAction({ req, action: "Driver toggle status failed", file: "routes/driver.js:toggle_status", error: e });
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
        _id: newDocId(),
        imageUrl: String(req.body.imageUrl).trim().slice(0, 500),
        brand: String(req.body.brand).trim().slice(0, 80),
        model: String(req.body.model).trim().slice(0, 80),
        color: String(req.body.color).trim().slice(0, 40),
        plateNumber: String(req.body.plateNumber).trim().slice(0, 24),
        seats: Number(req.body.seats),
        carCategory: String(req.body.carCategory || "sedan").toLowerCase(),
      };
      if (!isOwnedUploadUrl(req.userId, car.imageUrl)) throw new AppError("Invalid image URL", 400);
      if (!Array.isArray(prof.cars)) prof.cars = [];
      prof.cars.push(car);
      if (!prof.selectedCarId) prof.selectedCarId = car._id;
      await prof.save();
      logAction({ req, action: "Car added", file: "routes/driver.js:cars_add", extra: { brand: car.brand, model: car.model, plateNumber: car.plateNumber } });
      return res.status(201).json({ profile: prof.toJSON() });
    } catch (e) {
      logAction({ req, action: "Car add failed", file: "routes/driver.js:cars_add", error: e });
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
      logAction({ req, action: "Car updated", file: "routes/driver.js:cars_update", extra: { carId: req.params.carId } });
      return res.json({ profile: prof.toJSON() });
    } catch (e) {
      logAction({ req, action: "Car update failed", file: "routes/driver.js:cars_update", error: e });
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
    logAction({ req, action: "Car deleted", file: "routes/driver.js:cars_delete", extra: { carId } });
    return res.json({ ok: true, profile: prof.toJSON() });
  } catch (e) {
    logAction({ req, action: "Car delete failed", file: "routes/driver.js:cars_delete", error: e });
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
    logAction({ req, action: "Active car changed", file: "routes/driver.js:set_active_car", extra: { carId } });
    return res.json({ ok: true, profile: prof.toJSON() });
  } catch (e) {
    logAction({ req, action: "Set active car failed", file: "routes/driver.js:set_active_car", error: e });
    next(e);
  }
});

router.post(
  "/location-update",
  requireApprovedDriver,
  validate(driverLocationSchema),
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
      logAction({ req, action: "Location updated", file: "routes/driver.js:location_update", extra: { lat: Number(lat), lng: Number(lng) } });
      return res.json({ location: user.location });
    } catch (e) {
      logAction({ req, action: "Location update failed", file: "routes/driver.js:location_update", error: e });
      next(e);
    }
  }
);

export default router;
