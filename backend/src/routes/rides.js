import { Router } from "express";
import { body, param, query } from "express-validator";
import { Ride } from "../models/Ride.js";
import { Booking } from "../models/Booking.js";
import { User } from "../models/User.js";
import { Message } from "../models/Message.js";
import { Vehicle } from "../models/Vehicle.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { requireApprovedDriver } from "../middleware/driverGate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { validate } from "../middleware/validate.js";
import { docIdBody, docIdParam, docIdOptionalBody } from "../middleware/docId.js";
import { AppError } from "../errors/AppError.js";
import {
  createRideSchema,
  nearbyDriversSchema,
  routePreviewSchema,
  respondOfferSchema,
  chatMessageSchema,
  chatQuerySchema,
  rateRideSchema,
  acceptRideSchema,
} from "../schemas/ride.schemas.js";
import { applyDriverRatingFromRide } from "../services/driverRating.js";
import { enrichRidesWithPassengerStats, getPassengerPublicStats } from "../services/passengerStats.js";
import { applyPassengerRatingFromRide } from "../services/passengerRating.js";
import { haversineKm, fareFromVehiclePricing } from "../utils/geo.js";
import { buildRoutePath } from "../utils/directions.js";
import { computeSeatUnits, roundSeatUnits } from "../utils/seatUnits.js";
import { atomicRidePayment, creditDriverForRide, debitPassengerForRide, refundPassengerForRide } from "../services/walletLedger.js";
import {
  MAX_DRIVER_CONCURRENT_RIDES,
  assertDriverCanTakeAnotherRide,
  countDriverAssignedRides,
} from "../services/driverRideCapacity.js";
import {
  notifyRideAccepted,
  notifyDriverArrived,
  notifyPassengerOnboard,
  notifyTripStarted,
  notifyTripCompleted,
  notifyRideCancelled,
  notifyNewMessage,
  notifyPaymentReceived,
} from "../services/notificationHelpers.js";
import { requestRide, getRideStatus, getRequestedRides, acceptRide } from "../services/rideNativeService.js";
import { getMessagesByRideId, createMessage } from "../mongo/queries/messages.js";
import { logAction } from "../utils/logger.js";

const router = Router();

/* ── Conditional driver gate: admins bypass vehicle check ── */
async function requireApprovedDriverUnlessAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.role === "admin") return next();
    const mode = user.active_role || user.role || "passenger";
    if (mode !== "driver") return res.status(403).json({ message: "Forbidden" });
    if (!user.isOnline) return res.status(403).json({ message: "Driver is offline — go online before accepting rides" });
    return requireApprovedDriver(req, res, next);
  } catch (e) {
    next(e);
  }
}

/* ── V2 endpoints (authenticated, role-gated) ── */

router.post("/", authRequired, blockCheck, roleRequired("passenger", "admin"), validate(createRideSchema), async (req, res) => {
  try {
    const { pickup, dropoff, vehicleType } = req.body;
    if (!pickup || !dropoff || !vehicleType) {
      return res
        .status(400)
        .json({ success: false, error: { code: "RIDE_ERROR", message: "pickup, dropoff, and vehicleType are required" } });
    }
    const result = await requestRide(
      req.userId,
      {
        latitude: pickup.lat,
        longitude: pickup.lng,
        address: pickup.address || "",
      },
      {
        latitude: dropoff.lat,
        longitude: dropoff.lng,
        address: dropoff.address || "",
      },
      vehicleType,
    );
    logAction({ req, action: "Ride created", file: "routes/rides.js:create", extra: { rideId: result.ride?._id, vehicleType } });
    return res.status(201).json({ success: true, data: { ride: result.ride, nearbyDrivers: result.nearbyDrivers.length } });
  } catch (err) {
    logAction({ req, action: "Ride create failed", file: "routes/rides.js:create", error: err });
    const status = err.message === "User already has an active ride" ? 400 : 500;
    return res.status(status).json({ success: false, error: { code: "RIDE_ERROR", message: err.message } });
  }
});

router.get(
  "/requested",
  authRequired,
  blockCheck,
  roleRequired("driver", "admin"),
  requireApprovedDriverUnlessAdmin,
  async (req, res) => {
    try {
      const vehicleType = req.query.vehicleType;
      const result = await getRequestedRides(vehicleType);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, error: { code: "RIDE_ERROR", message: err.message } });
    }
  },
);

router.post(
  "/:id/accept",
  authRequired,
  blockCheck,
  roleRequired("driver", "admin"),
  requireApprovedDriverUnlessAdmin,
  validate(acceptRideSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const driverId = req.userId;
      await assertDriverCanTakeAnotherRide(driverId);
      const result = await acceptRide(id, driverId);
      logAction({ req, action: "Ride accepted by driver", file: "routes/rides.js:accept", extra: { rideId: id } });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      logAction({
        req,
        action: "Ride accept failed",
        file: "routes/rides.js:accept",
        error: err,
        extra: { rideId: req.params.id },
      });
      const msg = err.message.toLowerCase();
      let status = 500;
      if (msg.includes("not found")) status = 404;
      else if (msg.includes("no longer available")) status = 409;
      else if (msg.includes("at most") || msg.includes("active rides")) status = 409;
      return res.status(status).json({ success: false, error: { code: "RIDE_ERROR", message: err.message } });
    }
  },
);

router.get("/:id/status", authRequired, blockCheck, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getRideStatus(id);
    const caller = await User.findById(req.userId).select("role").lean();
    const isAdmin = caller?.role === "admin";
    const isPassenger = String(result.passenger_id) === String(req.userId);
    const isDriver = String(result.driverId || result.driver_id || "") === String(req.userId);
    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.message.toLowerCase().includes("not found") ? 404 : 500;
    return res.status(status).json({ success: false, error: { code: "RIDE_ERROR", message: err.message } });
  }
});

router.post(
  "/:id/arriving",
  authRequired,
  blockCheck,
  roleRequired("driver", "admin"),
  requireApprovedDriverUnlessAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await Ride.findOneAndUpdate(
        { _id: id, status: "accepted", $or: [{ driverId: req.userId }, { driver_id: req.userId }] },
        { $set: { status: "driver_arriving", arrivingAt: new Date() } },
        { new: true },
      );
      if (!updated) {
        const ride = await Ride.findById(id);
        if (!ride) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Ride not found" } });
        const isDriver = String(ride.driverId || ride.driver_id || "") === String(req.userId);
        const caller = await User.findById(req.userId).select("role").lean();
        if (!isDriver && caller?.role !== "admin") {
          return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Not your ride" } });
        }
        if (ride.status === "driver_arriving") {
          return res.status(200).json({ success: true, data: ride });
        }
        return res.status(400).json({ success: false, error: { code: "STATE_ERROR", message: "Ride must be accepted first" } });
      }
      notifyDriverArrived(updated).catch(() => {});
      logAction({ req, action: "Ride status → driver_arriving", file: "routes/rides.js:arriving", extra: { rideId: id } });
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      logAction({
        req,
        action: "Ride arriving failed",
        file: "routes/rides.js:arriving",
        error: err,
        extra: { rideId: req.params.id },
      });
      return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: err.message } });
    }
  },
);

router.post(
  "/:id/onboard",
  authRequired,
  blockCheck,
  roleRequired("driver", "admin"),
  requireApprovedDriverUnlessAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await Ride.findOneAndUpdate(
        { _id: id, status: "driver_arriving", $or: [{ driverId: req.userId }, { driver_id: req.userId }] },
        { $set: { status: "passenger_onboard", onboardAt: new Date() } },
        { new: true },
      );
      if (!updated) {
        const ride = await Ride.findById(id);
        if (!ride) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Ride not found" } });
        const isDriver = String(ride.driverId || ride.driver_id || "") === String(req.userId);
        const caller = await User.findById(req.userId).select("role").lean();
        if (!isDriver && caller?.role !== "admin") {
          return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Not your ride" } });
        }
        if (ride.status === "passenger_onboard") {
          return res.status(200).json({ success: true, data: ride });
        }
        return res.status(400).json({ success: false, error: { code: "STATE_ERROR", message: "Driver must arrive first" } });
      }
      notifyPassengerOnboard(updated).catch(() => {});
      logAction({ req, action: "Ride status → passenger_onboard", file: "routes/rides.js:onboard", extra: { rideId: id } });
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      logAction({
        req,
        action: "Ride onboard failed",
        file: "routes/rides.js:onboard",
        error: err,
        extra: { rideId: req.params.id },
      });
      return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: err.message } });
    }
  },
);

/* ── V2 Cancel endpoints (/:id style matching other V2 patterns) ── */

/** Passenger: cancel own ride */
router.post("/:id/cancel", authRequired, blockCheck, roleRequired("passenger"), async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body.reason || "")
      .trim()
      .slice(0, 300);
    const updated = await Ride.findOneAndUpdate(
      {
        _id: id,
        passengerId: req.userId,
        status: { $in: ["pending", "accepted", "driver_arriving", "passenger_onboard"] },
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: "passenger",
          cancelReason: reason,
          driverId: null,
          driverProposal: null,
          awaitingDriverConfirm: false,
          preassignedDriverId: null,
          preassignedFare: null,
        },
      },
      { new: true },
    );
    if (!updated) {
      const ride = await Ride.findById(id);
      if (!ride) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Ride not found" } });
      if (String(ride.passengerId) !== String(req.userId)) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Not your ride" } });
      }
      if (ride.status === "cancelled") {
        return res.status(200).json({ success: true, data: ride });
      }
      return res
        .status(400)
        .json({ success: false, error: { code: "STATE_ERROR", message: "Ride cannot be cancelled at this stage" } });
    }
    refundPassengerForRide(req.userId, updated._id, updated.agreedFare || updated.estimatedFare).catch(() => {});
    notifyRideCancelled(updated, req.userId, reason).catch(() => {});
    logAction({
      req,
      action: "Ride cancelled by passenger",
      file: "routes/rides.js:cancel_passenger",
      extra: { rideId: id, reason },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    logAction({
      req,
      action: "Ride cancel by passenger failed",
      file: "routes/rides.js:cancel_passenger",
      error: err,
      extra: { rideId: req.params.id },
    });
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

/** Driver: cancel own ride (accepted, arriving, onboard) */
router.post("/:id/driver-cancel", authRequired, blockCheck, roleRequired("driver"), requireApprovedDriver, async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body.reason || "")
      .trim()
      .slice(0, 300);
    const updated = await Ride.findOneAndUpdate(
      {
        _id: id,
        driverId: req.userId,
        status: { $in: ["accepted", "driver_arriving", "passenger_onboard"] },
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: "driver",
          cancelReason: reason,
          driverProposal: null,
          awaitingDriverConfirm: false,
          preassignedDriverId: null,
          preassignedFare: null,
        },
      },
      { new: true },
    );
    if (!updated) {
      const ride = await Ride.findById(id);
      if (!ride) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Ride not found" } });
      if (String(ride.driverId || "") !== String(req.userId)) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Not your ride" } });
      }
      if (ride.status === "cancelled") {
        return res.status(200).json({ success: true, data: ride });
      }
      return res
        .status(400)
        .json({ success: false, error: { code: "STATE_ERROR", message: "Ride cannot be cancelled at this stage" } });
    }
    refundPassengerForRide(updated.passengerId, updated._id, updated.agreedFare || updated.estimatedFare).catch(() => {});
    notifyRideCancelled(updated, updated.driverId, reason).catch(() => {});
    logAction({ req, action: "Ride cancelled by driver", file: "routes/rides.js:cancel_driver", extra: { rideId: id, reason } });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    logAction({
      req,
      action: "Ride cancel by driver failed",
      file: "routes/rides.js:cancel_driver",
      error: err,
      extra: { rideId: req.params.id },
    });
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

/** Admin: cancel any ride */
router.post("/:id/admin-cancel", authRequired, blockCheck, roleRequired("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body.reason || "Admin action")
      .trim()
      .slice(0, 300);
    const updated = await Ride.findOneAndUpdate(
      {
        _id: id,
        status: { $nin: ["completed", "cancelled"] },
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: "admin",
          cancelReason: reason,
          driverProposal: null,
          awaitingDriverConfirm: false,
          preassignedDriverId: null,
          preassignedFare: null,
        },
      },
      { new: true },
    );
    if (!updated) {
      const ride = await Ride.findById(id);
      if (!ride) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Ride not found" } });
      if (ride.status === "cancelled") {
        return res.status(200).json({ success: true, data: ride });
      }
      return res.status(400).json({ success: false, error: { code: "STATE_ERROR", message: "Ride already finished" } });
    }
    refundPassengerForRide(updated.passengerId, updated._id, updated.agreedFare || updated.estimatedFare).catch(() => {});
    notifyRideCancelled(updated, updated.driverId, reason).catch(() => {});
    logAction({ req, action: "Ride cancelled by admin", file: "routes/rides.js:cancel_admin", extra: { rideId: id, reason } });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    logAction({
      req,
      action: "Ride cancel by admin failed",
      file: "routes/rides.js:cancel_admin",
      error: err,
      extra: { rideId: req.params.id },
    });
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

router.use(authRequired, blockCheck);

function parsePagination(req, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
  const page = Math.max(1, Number(req.query.page) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

const OFFER_TTL_MS = Number(process.env.OFFER_TTL_MS) || 10 * 60 * 1000; // 10 minutes

function isOfferExpired(ride) {
  const exp = ride?.driverProposal?.expiresAt ? new Date(ride.driverProposal.expiresAt) : null;
  if (!exp) return false;
  return exp.getTime() <= Date.now();
}

async function clearExpiredOfferIfNeeded(ride) {
  if (!ride?.driverProposal?.driverId) return false;
  if (!isOfferExpired(ride)) return false;
  ride.driverProposal = null;
  await ride.save();
  return true;
}

async function getRideAndAssertParticipant(rideId, userId) {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Not found", 404);
  const uid = userId.toString();
  const isPassenger = String(ride.passengerId) === uid;
  const isAssignedDriver = ride.driverId && String(ride.driverId) === uid;
  const isProposingDriver = ride.driverProposal?.driverId && String(ride.driverProposal.driverId) === uid;
  const preId = ride.preassignedDriverId && String(ride.preassignedDriverId);
  const isPreassignedDriver = ride.awaitingDriverConfirm && preId === uid;
  const isDriver = isAssignedDriver || isProposingDriver || isPreassignedDriver;
  if (!isPassenger && !isDriver) {
    const user = await User.findById(userId);
    if (user?.role !== "admin") throw new AppError("Forbidden", 403);
  }
  return ride;
}

function canPostChatMessage(ride, userId) {
  const uid = userId.toString();
  if (ride.status === "completed" || ride.status === "cancelled") return false;
  if (ride.status === "pending") {
    if (String(ride.passengerId) === uid) return true;
    const propDriver = ride.driverProposal?.driverId;
    if (propDriver && String(propDriver) === uid) return true;
    const pre = ride.preassignedDriverId;
    if (ride.awaitingDriverConfirm && pre && String(pre) === uid) return true;
    return false;
  }
  if (ride.status === "accepted" || ride.status === "ongoing") {
    return String(ride.passengerId) === uid || (ride.driverId && String(ride.driverId) === uid);
  }
  return false;
}

const ridePopulate = [
  { path: "passengerId", select: "name email profileImageUrl location phone" },
  { path: "driverId", select: "name email location profileImageUrl phone vehicleType" },
  { path: "driverProposal.driverId", select: "name email location profileImageUrl phone vehicleType" },
  { path: "preassignedDriverId", select: "name email location profileImageUrl phone vehicleType" },
];

const bookingPopulate = {
  path: "bookings",
  match: { status: "confirmed" },
  options: { sort: { createdAt: 1 } },
  populate: { path: "passengerId", select: "name email phone profileImageUrl" },
};

async function populatedRideById(id) {
  return Ride.findById(id).populate(ridePopulate).populate(bookingPopulate);
}

const rideIdValidators = [docIdBody("rideId"), validateRequest];

/** Passenger: nearby online drivers (optionally filtered by vehicleType + radius from lat/lng) */
router.get(
  "/nearby-drivers",
  roleRequired("passenger", "admin"),
  validate(nearbyDriversSchema, "query"),
  async (req, res, next) => {
    try {
      const raw = req.query.vehicleType;
      const vt = typeof raw === "string" && raw.trim() ? String(raw).toLowerCase().trim() : null;
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radiusKm = Number(req.query.radiusKm) || 15;
      const q = { active_role: "driver", isOnline: true };
      if (vt) q.vehicleType = vt;
      let drivers = await User.find(q).select("name email location isOnline vehicleType").lean();
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        drivers = drivers
          .filter((d) => d.location && Number.isFinite(d.location.lat) && Number.isFinite(d.location.lng))
          .map((d) => ({
            ...d,
            distanceKm: Math.round(haversineKm(lat, lng, d.location.lat, d.location.lng) * 100) / 100,
          }))
          .filter((d) => d.distanceKm <= radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm);
      }
      return res.json({ drivers, vehicleType: vt, radiusKm: Number.isFinite(lat) ? radiusKm : null });
    } catch (e) {
      next(e);
    }
  },
);

/** Route preview for map (pickup → destination) before or during booking */
router.get(
  "/route-preview",
  roleRequired("passenger", "driver", "admin"),
  validate(routePreviewSchema, "query"),
  async (req, res, next) => {
    try {
      const fromLat = Number(req.query.fromLat);
      const fromLng = Number(req.query.fromLng);
      const toLat = Number(req.query.toLat);
      const toLng = Number(req.query.toLng);
      if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
        throw new AppError("fromLat, fromLng, toLat, toLng required", 400);
      }
      const pickup = { lat: fromLat, lng: fromLng };
      const dest = { lat: toLat, lng: toLng };
      const routePath = await buildRoutePath(pickup, dest);
      const distanceKm = Math.round(haversineKm(fromLat, fromLng, toLat, toLng) * 100) / 100;
      const etaMinutes = Math.max(1, Math.ceil(distanceKm / 0.5));
      return res.json({ routePath, distanceKm, etaMinutes });
    } catch (e) {
      next(e);
    }
  },
);

/** Passenger: create ride */
router.post(
  "/create",
  roleRequired("passenger"),
  body("pickupLocation.lat").isFloat({ min: -90, max: 90 }),
  body("pickupLocation.lng").isFloat({ min: -180, max: 180 }),
  body("destinationLocation.lat").isFloat({ min: -90, max: 90 }),
  body("destinationLocation.lng").isFloat({ min: -180, max: 180 }),
  body("pickupLocation.address").optional().isString().isLength({ max: 200 }),
  body("destinationLocation.address").optional().isString().isLength({ max: 200 }),
  body("vehicleType").trim().notEmpty().isLength({ min: 1, max: 32 }),
  body("parcel.description").optional().isString().isLength({ max: 200 }),
  body("parcel.receiverName").optional().isString().isLength({ max: 80 }),
  body("parcel.receiverPhone").optional().isString().isLength({ max: 32 }),
  body("parcel.notes").optional().isString().isLength({ max: 500 }),
  body("parcel.deliverBy").optional().isISO8601(),
  body("paymentMethod").optional().isIn(["cash", "wallet"]),
  body("passengerMinFare").optional().isFloat({ min: 0 }).toFloat(),
  body("passengerCount").optional().isInt({ min: 1, max: 8 }).toInt(),
  body("passengerSize").optional().isIn(["SMALL", "MEDIUM", "LARGE", "XL"]),
  body("passengerGender").optional().isIn(["male", "female", "unspecified"]),
  body("passengerGenderPreference").optional().isIn(["all", "male_only", "female_only"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const existingActive = await Ride.findOne({
        passengerId: req.userId,
        status: { $in: ["pending", "accepted", "driver_arriving", "passenger_onboard", "ongoing"] },
      });
      if (existingActive) throw new AppError("You already have an active ride", 400);

      const vt = String(req.body.vehicleType).toLowerCase().trim();
      const vehicleDoc = await Vehicle.findOne({ typeKey: vt, active: true });
      if (!vehicleDoc) throw new AppError("Invalid vehicle type", 400);

      const isParcel = vt === "shipping";
      if (isParcel) {
        const desc = String(req.body?.parcel?.description || "").trim();
        if (!desc) throw new AppError("parcel.description is required for shipping", 400);
      }

      const passengerCount =
        req.body.passengerCount != null && req.body.passengerCount !== "" ? Number(req.body.passengerCount) : 1;
      const passengerSize = String(req.body.passengerSize || "MEDIUM")
        .toUpperCase()
        .trim();
      const seatUnits = computeSeatUnits(passengerCount, passengerSize);
      const cap = Number(vehicleDoc.capacity) || 4;
      if (seatUnits > cap) {
        throw new AppError(`This booking needs ${seatUnits} seat units but this vehicle capacity is ${cap} units`, 400);
      }
      const availableSeatUnits = roundSeatUnits(cap - seatUnits);
      if (availableSeatUnits < 0) {
        throw new AppError("Not enough seat capacity for this booking", 400);
      }

      const { pickupLocation, destinationLocation } = req.body;
      const pickup = {
        lat: Number(pickupLocation.lat),
        lng: Number(pickupLocation.lng),
        address: pickupLocation.address || "",
      };
      const dest = {
        lat: Number(destinationLocation.lat),
        lng: Number(destinationLocation.lng),
        address: destinationLocation.address || "",
      };
      const km = haversineKm(pickup.lat, pickup.lng, dest.lat, dest.lng);
      const estimatedFare = fareFromVehiclePricing(vehicleDoc.baseFare, vehicleDoc.pricePerKm, km);
      const routePath = await buildRoutePath(pickup, dest);
      const etaSeconds = Math.max(60, Math.round((km / 30) * 3600 + 5 * 60)); // ~30km/h + 5min buffer

      const rawMinInput =
        req.body.passengerMinFare != null && req.body.passengerMinFare !== ""
          ? req.body.passengerMinFare
          : req.body.passengerMaxFare;
      let passengerMinFare = estimatedFare;
      if (rawMinInput != null && rawMinInput !== "") {
        const raw = Number(rawMinInput);
        if (Number.isNaN(raw) || raw < estimatedFare) {
          throw new AppError("passengerMinFare must be at least the suggested fare", 400);
        }
        passengerMinFare = Math.round(raw * 100) / 100;
      }

      /** Seat reservation uses atomic read-modify-write on Firestore. */
      let createdRide;
      try {
        const deliverBy =
          req.body?.parcel?.deliverBy != null && String(req.body.parcel.deliverBy).trim()
            ? new Date(String(req.body.parcel.deliverBy))
            : new Date(Date.now() + etaSeconds * 1000);
        const paymentMethod =
          req.body.paymentMethod != null && String(req.body.paymentMethod).trim()
            ? String(req.body.paymentMethod).toLowerCase().trim()
            : "cash";
        createdRide = await Ride.create({
          passengerId: req.userId,
          pickupLocation: pickup,
          destinationLocation: dest,
          status: "pending",
          paymentMethod,
          vehicleType: vt,
          parcel: isParcel
            ? {
                description: String(req.body?.parcel?.description || "").trim(),
                receiverName: String(req.body?.parcel?.receiverName || "").trim(),
                receiverPhone: String(req.body?.parcel?.receiverPhone || "").trim(),
                notes: String(req.body?.parcel?.notes || "").trim(),
                deliverBy,
                etaSeconds,
              }
            : null,
          estimatedFare,
          passengerMinFare,
          routePath,
          totalSeats: cap,
          availableSeatUnits,
          poolingEnabled: true,
          passengerGenderPolicy: req.body.passengerGenderPreference != null ? String(req.body.passengerGenderPreference) : "all",
        });
        await Booking.create({
          rideId: createdRide._id,
          passengerId: req.userId,
          passengerCount,
          passengerSize,
          seatsReserved: seatUnits,
          passengerGender: req.body.passengerGender != null ? String(req.body.passengerGender) : "unspecified",
          status: "confirmed",
        });
      } catch (e) {
        if (createdRide?._id) {
          await Ride.deleteOne({ _id: createdRide._id }).catch(() => {});
        }
        throw e;
      }

      const populated = await populatedRideById(createdRide._id);
      return res.status(201).json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

function minDistanceToRouteKm(routePath, point) {
  if (!Array.isArray(routePath) || routePath.length === 0) return null;
  let best = Infinity;
  for (const p of routePath) {
    if (p?.lat == null || p?.lng == null) continue;
    const d = haversineKm(Number(p.lat), Number(p.lng), Number(point.lat), Number(point.lng));
    if (d < best) best = d;
  }
  return Number.isFinite(best) ? best : null;
}

function isRouteCompatible(candidateRide, pickup, dest, thresholdsKm) {
  const { pickupKm = 1.5, destKm = 3.5, alongRouteKm = 1.5 } = thresholdsKm || {};
  const pu = candidateRide.pickupLocation;
  const de = candidateRide.destinationLocation;
  if (!pu || !de) return false;

  const dPickup = haversineKm(Number(pu.lat), Number(pu.lng), Number(pickup.lat), Number(pickup.lng));
  const dDest = haversineKm(Number(de.lat), Number(de.lng), Number(dest.lat), Number(dest.lng));

  if (dPickup <= pickupKm && dDest <= destKm) return true;

  const toRoutePu = minDistanceToRouteKm(candidateRide.routePath, pickup);
  const toRouteDe = minDistanceToRouteKm(candidateRide.routePath, dest);
  if (toRoutePu != null && toRouteDe != null && toRoutePu <= alongRouteKm && toRouteDe <= alongRouteKm) return true;
  return false;
}

/** Passenger: find pool rides that can take more passengers (route + seats + gender policy). */
router.post(
  "/pool-matches",
  roleRequired("passenger"),
  body("pickupLocation.lat").isFloat({ min: -90, max: 90 }),
  body("pickupLocation.lng").isFloat({ min: -180, max: 180 }),
  body("destinationLocation.lat").isFloat({ min: -90, max: 90 }),
  body("destinationLocation.lng").isFloat({ min: -180, max: 180 }),
  body("vehicleType").trim().notEmpty().isLength({ min: 1, max: 32 }),
  body("passengerCount").optional().isInt({ min: 1, max: 8 }).toInt(),
  body("passengerSize").optional().isIn(["SMALL", "MEDIUM", "LARGE", "XL"]),
  body("passengerGender").optional().isIn(["male", "female", "unspecified"]),
  body("pickupKm").optional().isFloat({ min: 0, max: 20 }).toFloat(),
  body("destKm").optional().isFloat({ min: 0, max: 50 }).toFloat(),
  body("alongRouteKm").optional().isFloat({ min: 0, max: 20 }).toFloat(),
  validateRequest,
  async (req, res, next) => {
    try {
      const vt = String(req.body.vehicleType).toLowerCase().trim();
      const passengerCount = req.body.passengerCount != null ? Number(req.body.passengerCount) : 1;
      const passengerSize = String(req.body.passengerSize || "MEDIUM")
        .toUpperCase()
        .trim();
      const needUnits = computeSeatUnits(passengerCount, passengerSize);
      const passengerGender = String(req.body.passengerGender || "unspecified");

      const pickup = { lat: Number(req.body.pickupLocation.lat), lng: Number(req.body.pickupLocation.lng) };
      const dest = { lat: Number(req.body.destinationLocation.lat), lng: Number(req.body.destinationLocation.lng) };
      const thresholdsKm = {
        pickupKm: req.body.pickupKm != null ? Number(req.body.pickupKm) : 1.5,
        destKm: req.body.destKm != null ? Number(req.body.destKm) : 3.5,
        alongRouteKm: req.body.alongRouteKm != null ? Number(req.body.alongRouteKm) : 1.5,
      };

      const baseQ = {
        status: "accepted",
        poolingEnabled: true,
        vehicleType: vt,
        availableSeatUnits: { $gte: needUnits },
      };
      const rides = await Ride.find(baseQ)
        .sort({ acceptedAt: -1, createdAt: -1 })
        .limit(60)
        .populate(ridePopulate)
        .populate(bookingPopulate)
        .lean();

      const filtered = rides.filter((r) => {
        if (!isRouteCompatible(r, pickup, dest, thresholdsKm)) return false;
        const pol = r.passengerGenderPolicy || "all";
        if (pol === "all" || passengerGender === "unspecified") return true;
        if (pol === "male_only") return passengerGender === "male";
        if (pol === "female_only") return passengerGender === "female";
        return true;
      });

      return res.json({ rides: filtered.slice(0, 20) });
    } catch (e) {
      next(e);
    }
  },
);

/** Passenger: join an accepted pooled ride (atomic seat decrement; prevents overbooking). */
router.post(
  "/join",
  roleRequired("passenger"),
  docIdBody("rideId"),
  body("passengerCount").optional().isInt({ min: 1, max: 8 }).toInt(),
  body("passengerSize").optional().isIn(["SMALL", "MEDIUM", "LARGE", "XL"]),
  body("passengerGender").optional().isIn(["male", "female", "unspecified"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const rideId = String(req.body.rideId);
      const passengerCount = req.body.passengerCount != null ? Number(req.body.passengerCount) : 1;
      const passengerSize = String(req.body.passengerSize || "MEDIUM")
        .toUpperCase()
        .trim();
      const seatUnits = computeSeatUnits(passengerCount, passengerSize);
      const passengerGender = String(req.body.passengerGender || "unspecified");

      const already = await Booking.findOne({ rideId, passengerId: req.userId, status: "confirmed" });
      if (already) throw new AppError("Already joined this ride", 409);

      const ride = await Ride.findById(rideId).lean();
      if (!ride) throw new AppError("Not found", 404);
      if (ride.status !== "accepted") throw new AppError("Ride is not accepting more passengers", 400);
      if (ride.poolingEnabled !== true) throw new AppError("Pooling is disabled for this ride", 403);
      const pol = ride.passengerGenderPolicy || "all";
      if (pol !== "all" && passengerGender !== "unspecified") {
        if (pol === "male_only" && passengerGender !== "male") throw new AppError("Gender preference mismatch", 403);
        if (pol === "female_only" && passengerGender !== "female") throw new AppError("Gender preference mismatch", 403);
      }

      const updated = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          status: "accepted",
          poolingEnabled: true,
          availableSeatUnits: { $gte: seatUnits },
        },
        { $inc: { availableSeatUnits: -seatUnits } },
        { new: true },
      );
      if (!updated) throw new AppError("No seats left", 409);

      try {
        await Booking.create({
          rideId,
          passengerId: req.userId,
          passengerCount,
          passengerSize,
          seatsReserved: seatUnits,
          passengerGender,
          status: "confirmed",
        });
      } catch (e) {
        // rollback seats on failure
        await Ride.updateOne({ _id: rideId }, { $inc: { availableSeatUnits: seatUnits } }).catch(() => {});
        throw e;
      }

      const populated = await populatedRideById(rideId);

      return res.status(201).json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

/** Driver: pending rides (excludes other drivers' proposals; excludes rides awaiting another driver's confirmation) */
router.get("/available", roleRequired("driver"), requireApprovedDriver, async (req, res, next) => {
  try {
    const driver = await User.findById(req.userId);
    const vt = driver?.vehicleType || "delivery";
    const assignedCount = await countDriverAssignedRides(req.userId);
    const rides = await Ride.find({
      status: "pending",
      driverId: null,
      vehicleType: vt,
      $and: [
        {
          $or: [{ awaitingDriverConfirm: { $ne: true } }, { awaitingDriverConfirm: true, preassignedDriverId: req.userId }],
        },
        {
          $or: [{ driverProposal: null }, { "driverProposal.driverId": req.userId }],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate(ridePopulate)
      .populate(bookingPopulate);
    const enriched = await enrichRidesWithPassengerStats(rides);
    return res.json({
      rides: enriched,
      assignedCount,
      maxConcurrent: MAX_DRIVER_CONCURRENT_RIDES,
      canTakeMore: assignedCount < MAX_DRIVER_CONCURRENT_RIDES,
    });
  } catch (e) {
    next(e);
  }
});

/** Driver: currently assigned trips (accepted + ongoing, up to max concurrent). */
router.get("/my-active", roleRequired("driver"), requireApprovedDriver, async (req, res, next) => {
  try {
    const rides = await Ride.find({
      driverId: req.userId,
      status: { $in: ["accepted", "ongoing"] },
    })
      .sort({ acceptedAt: 1, createdAt: 1 })
      .limit(MAX_DRIVER_CONCURRENT_RIDES)
      .populate(ridePopulate)
      .populate(bookingPopulate);
    const assignedCount = await countDriverAssignedRides(req.userId);
    return res.json({
      rides,
      assignedCount,
      maxConcurrent: MAX_DRIVER_CONCURRENT_RIDES,
    });
  } catch (e) {
    next(e);
  }
});

/** Driver: submit or update price offer; passenger must accept before trip is assigned */
router.post(
  "/accept",
  roleRequired("driver"),
  requireApprovedDriver,
  docIdBody("rideId"),
  /** Accept JSON numbers from mobile (isFloat alone can reject numeric types in some validators). */
  body("proposedFare")
    .optional({ values: "null" })
    .custom((v) => v === undefined || v === null || v === "" || (!Number.isNaN(Number(v)) && Number(v) > 0))
    .withMessage("Invalid proposed fare"),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride || ride.status !== "pending" || ride.driverId) {
        throw new AppError("Ride not available", 400);
      }
      if (ride.awaitingDriverConfirm) {
        throw new AppError("Ride is waiting for driver confirmation", 400);
      }
      await assertDriverCanTakeAnotherRide(req.userId);
      // Clean stale proposal if any (so drivers can re-offer cleanly)
      if (isOfferExpired(ride)) {
        ride.driverProposal = null;
      }
      const driver = await User.findById(req.userId);
      if (!driver?.isOnline) throw new AppError("Driver is offline — go online before accepting rides", 403);
      const driverProfile = await DriverProfile.findOne({ userId: req.userId }).lean();
      const cars = Array.isArray(driverProfile.cars) ? driverProfile.cars : [];
      const selectedId = driverProfile.selectedCarId ? String(driverProfile.selectedCarId) : null;
      const selectedCar = (selectedId && cars.find((c) => String(c?._id) === selectedId)) || cars[0] || null;
      const dType = driver?.vehicleType || "delivery";
      if (String(ride.vehicleType || "delivery") !== String(dType)) {
        throw new AppError("This ride requires a different vehicle class", 403);
      }
      const existing = ride.driverProposal;
      if (existing?.driverId && String(existing.driverId) !== String(req.userId)) {
        throw new AppError("Another driver already has a pending offer on this ride", 409);
      }
      const base = Number(ride.estimatedFare) || 0;
      let proposed = req.body.proposedFare != null && req.body.proposedFare !== "" ? Number(req.body.proposedFare) : base;
      if (Number.isNaN(proposed) || proposed <= 0) {
        throw new AppError("Invalid proposed fare", 400);
      }
      proposed = Math.round(proposed * 100) / 100;
      const floor = Math.max(base, Number(ride.passengerMinFare) || 0);
      if (proposed < floor) {
        throw new AppError(`Offer must be at least ${floor.toFixed(2)} (passenger minimum / suggested fare)`, 400);
      }
      ride.driverProposal = {
        driverId: req.userId,
        proposedFare: proposed,
        proposedAt: new Date(),
        expiresAt: new Date(Date.now() + OFFER_TTL_MS),
        driverMeta: {
          name: driver?.name || "",
          profileImageUrl: driver?.profileImageUrl || "",
          carImageUrl: selectedCar?.imageUrl || driverProfile?.carImageUrl || "",
          carColor: selectedCar?.color || driverProfile?.carColor || "",
          carSpec:
            `${selectedCar?.brand || driverProfile?.carBrand || ""} ${selectedCar?.model || driverProfile?.carModel || ""}`.trim(),
          availableSeats: selectedCar?.seats ?? driverProfile?.numberOfSeats ?? null,
        },
      };
      await ride.save();
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

/** Driver: withdraw your pending offer (while ride is pending). */
router.post(
  "/withdraw-offer",
  roleRequired("driver"),
  requireApprovedDriver,
  docIdBody("rideId"),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride) throw new AppError("Not found", 404);
      if (ride.status !== "pending" || ride.driverId) throw new AppError("Ride not in negotiation", 400);
      if (ride.awaitingDriverConfirm) throw new AppError("Ride is waiting for driver confirmation", 400);
      const prop = ride.driverProposal;
      if (!prop?.driverId || String(prop.driverId) !== String(req.userId)) {
        throw new AppError("No pending offer to withdraw", 400);
      }
      ride.driverProposal = null;
      await ride.save();
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

/** Passenger: accept or reject driver's price */
router.post(
  "/respond-proposal",
  roleRequired("passenger"),
  validate(respondOfferSchema),
  docIdBody("rideId"),
  body("accept").isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId, accept } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride || String(ride.passengerId) !== String(req.userId)) {
        throw new AppError("Not found", 404);
      }
      if (ride.status !== "pending" || ride.driverId) {
        throw new AppError("Ride not in negotiation", 400);
      }
      // Idempotent: if already awaiting driver confirm and passenger repeats accept, return current ride.
      if (ride.awaitingDriverConfirm) {
        if (accept) {
          const populated = await populatedRideById(ride._id);
          return res.json({ ride: populated });
        }
        throw new AppError("Already waiting for driver to confirm", 400);
      }
      // Offer expiry: do not allow accepting stale offers.
      if (isOfferExpired(ride)) {
        await clearExpiredOfferIfNeeded(ride);
        const populated = await populatedRideById(ride._id);
        throw new AppError("Offer expired. Ask the driver for a new price.", 409);
      }
      const prop = ride.driverProposal;
      if (!prop?.driverId) {
        throw new AppError("No driver offer to respond to", 400);
      }
      if (!accept) {
        ride.driverProposal = null;
        await ride.save();
        const populated = await populatedRideById(ride._id);
        return res.json({ ride: populated });
      }
      const proposed = Number(prop.proposedFare) || 0;
      ride.awaitingDriverConfirm = true;
      ride.preassignedDriverId = prop.driverId;
      ride.preassignedFare = proposed;
      ride.driverProposal = null;
      await ride.save();
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

/** Passenger: update minimum fare while pending (≥ suggested; not while waiting for driver confirm) */
router.post(
  "/passenger-min-fare",
  roleRequired("passenger"),
  docIdBody("rideId"),
  body("passengerMinFare").isFloat({ gt: 0 }).toFloat(),
  validateRequest,
  async (req, res, next) => {
    try {
      const driver = await User.findById(req.userId).select("isOnline").lean();
      if (!driver?.isOnline) throw new AppError("Driver is offline — go online before accepting rides", 403);

      const { rideId, accept } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride || String(ride.passengerId) !== String(req.userId)) {
        throw new AppError("Not found", 404);
      }
      if (ride.status !== "pending" || ride.driverId) {
        throw new AppError("Cannot update fare for this ride", 400);
      }
      if (ride.awaitingDriverConfirm) {
        throw new AppError("Cannot change fare while the driver is confirming the trip", 400);
      }
      const minSuggested = Number(ride.estimatedFare) || 0;
      const nextMin = Math.round(Number(passengerMinFare) * 100) / 100;
      if (Number.isNaN(nextMin) || nextMin < minSuggested) {
        throw new AppError("Minimum fare cannot be below the suggested fare", 400);
      }
      ride.passengerMinFare = nextMin;
      await ride.save();
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

/** Driver: after passenger accepted your price — confirm or reject the trip */
router.post(
  "/driver-confirm-booking",
  roleRequired("driver"),
  requireApprovedDriver,
  docIdBody("rideId"),
  body("accept").isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const driver = await User.findById(req.userId).select("isOnline").lean();
      if (!driver?.isOnline) throw new AppError("Driver is offline — go online before accepting rides", 403);

      const { rideId, accept } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride || ride.status !== "pending" || ride.driverId) {
        throw new AppError("Ride not available", 400);
      }
      // Idempotent: if already accepted by this driver, return it.
      if (ride.status === "accepted" && String(ride.driverId) === String(req.userId)) {
        const populated = await populatedRideById(ride._id);
        return res.json({ ride: populated });
      }
      if (!ride.awaitingDriverConfirm || String(ride.preassignedDriverId) !== String(req.userId)) {
        throw new AppError("No pending confirmation for you on this ride", 400);
      }
      if (!accept) {
        ride.awaitingDriverConfirm = false;
        ride.preassignedDriverId = null;
        ride.preassignedFare = null;
        await ride.save();
        const populated = await populatedRideById(ride._id);
        return res.json({ ride: populated });
      }
      await assertDriverCanTakeAnotherRide(req.userId, { excludeRideId: ride._id });
      const fare = Number(ride.preassignedFare) || 0;
      ride.driverId = ride.preassignedDriverId;
      ride.agreedFare = fare;
      ride.awaitingDriverConfirm = false;
      ride.preassignedDriverId = null;
      ride.preassignedFare = null;
      ride.status = "accepted";
      ride.acceptedAt = new Date();
      await ride.save();
      const populated = await populatedRideById(ride._id);
      notifyRideAccepted(ride).catch(() => {});
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

/** Driver: cancel an accepted ride before it starts (accepted only). */
router.post(
  "/driver-cancel",
  roleRequired("driver"),
  requireApprovedDriver,
  docIdBody("rideId"),
  body("reason").optional({ checkFalsy: true }).isString().trim().isLength({ max: 300 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId } = req.body;
      const reason = String(req.body.reason || "")
        .trim()
        .slice(0, 300);
      const updated = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          driverId: req.userId,
          status: { $in: ["accepted", "driver_arriving", "passenger_onboard"] },
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledBy: "driver",
            cancelReason: reason,
            driverProposal: null,
            awaitingDriverConfirm: false,
            preassignedDriverId: null,
            preassignedFare: null,
          },
        },
        { new: true },
      );
      if (!updated) {
        const ride = await Ride.findById(rideId);
        if (!ride) throw new AppError("Not found", 404);
        if (String(ride.driverId || "") !== String(req.userId)) throw new AppError("Not your ride", 403);
        if (ride.status === "cancelled") {
          const populated = await populatedRideById(ride._id);
          return res.json({ ride: populated });
        }
        throw new AppError("Ride cannot be cancelled at this stage", 400);
      }
      refundPassengerForRide(updated.passengerId, updated._id, updated.agreedFare || updated.estimatedFare).catch(() => {});
      const populated = await populatedRideById(updated._id);
      notifyRideCancelled(populated, updated.driverId, reason).catch(() => {});
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

router.post("/start", roleRequired("driver"), requireApprovedDriver, ...rideIdValidators, async (req, res, next) => {
  try {
    const { rideId } = req.body;
    const updated = await Ride.findOneAndUpdate(
      { _id: rideId, driverId: req.userId, status: { $in: ["accepted", "passenger_onboard"] } },
      { $set: { status: "ongoing", startedAt: new Date() } },
      { new: true },
    );
    if (!updated) {
      const ride = await Ride.findById(rideId);
      if (!ride || ride.driverId?.toString() !== req.userId) {
        throw new AppError("Not your ride", 403);
      }
      if (ride.status === "ongoing") {
        const populated = await populatedRideById(ride._id);
        return res.json({ ride: populated });
      }
      throw new AppError("Ride must be accepted or passenger onboard first", 400);
    }
    const populated = await populatedRideById(updated._id);
    notifyTripStarted(populated).catch(() => {});
    logAction({ req, action: "Ride started (ongoing)", file: "routes/rides.js:start", extra: { rideId } });
    return res.json({ ride: populated });
  } catch (e) {
    logAction({ req, action: "Ride start failed", file: "routes/rides.js:start", error: e, extra: { rideId: req.body?.rideId } });
    next(e);
  }
});

router.post("/end", roleRequired("driver"), requireApprovedDriver, ...rideIdValidators, async (req, res, next) => {
  try {
    const { rideId } = req.body;

    // Atomic guard: only one request wins the status transition.
    const updated = await Ride.findOneAndUpdate(
      { _id: rideId, driverId: req.userId, status: "ongoing" },
      { $set: { status: "completed", completedAt: new Date() } },
      { new: true },
    );

    if (!updated) {
      // Idempotent: if already completed, return current ride.
      const existing = await Ride.findById(rideId);
      if (!existing || existing.driverId?.toString() !== req.userId) {
        throw new AppError("Not your ride", 403);
      }
      if (existing.status === "completed") {
        const populated = await populatedRideById(rideId);
        return res.json({ ride: populated });
      }
      throw new AppError("Ride must be ongoing", 400);
    }

    const agreed = updated.agreedFare != null ? Number(updated.agreedFare) : null;
    updated.fare =
      agreed != null && !Number.isNaN(agreed) ? agreed : Number(updated.passengerMinFare ?? updated.estimatedFare) || 0;
    await updated.save();

    if (updated.driverId && updated.passengerId) {
      const paymentMethod = String(updated.paymentMethod || "cash").toLowerCase();
      if (paymentMethod === "wallet") {
        const ok = await atomicRidePayment(updated.passengerId, updated.driverId, rideId, updated.fare);
        if (!ok) {
          console.error("wallet atomicRidePayment failed — insufficient funds or already processed");
        }
      }
    }

    const populated = await populatedRideById(rideId);
    notifyTripCompleted(populated).catch(() => {});
    if (updated.driverId) {
      notifyPaymentReceived(updated.driverId, rideId, updated.fare).catch(() => {});
    }
    logAction({ req, action: "Ride completed", file: "routes/rides.js:end", extra: { rideId, fare: updated.fare } });
    return res.json({ ride: populated });
  } catch (e) {
    logAction({ req, action: "Ride end failed", file: "routes/rides.js:end", error: e, extra: { rideId: req.body?.rideId } });
    next(e);
  }
});

/** Passenger: cancel ride before it starts (pending/accepted only). */
router.post(
  "/cancel",
  roleRequired("passenger"),
  docIdBody("rideId"),
  body("reason").optional({ checkFalsy: true }).isString().trim().isLength({ max: 300 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId } = req.body;
      const reason = String(req.body.reason || "")
        .trim()
        .slice(0, 300);
      const updated = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          passengerId: req.userId,
          status: { $in: ["pending", "accepted", "driver_arriving", "passenger_onboard"] },
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledBy: "passenger",
            cancelReason: reason,
            driverId: null,
            driverProposal: null,
            awaitingDriverConfirm: false,
            preassignedDriverId: null,
            preassignedFare: null,
          },
        },
        { new: true },
      );
      if (!updated) {
        const ride = await Ride.findById(rideId);
        if (!ride) throw new AppError("Not found", 404);
        if (String(ride.passengerId) !== String(req.userId)) throw new AppError("Forbidden", 403);
        if (ride.status === "cancelled") {
          const populated = await populatedRideById(ride._id);
          return res.json({ ride: populated });
        }
        throw new AppError("Ride cannot be cancelled at this stage", 400);
      }
      refundPassengerForRide(req.userId, updated._id, updated.agreedFare || updated.estimatedFare).catch(() => {});
      const populated = await populatedRideById(updated._id);
      notifyRideCancelled(populated, req.userId, reason).catch(() => {});
      logAction({
        req,
        action: "Ride cancelled by passenger (V1)",
        file: "routes/rides.js:cancel_v1",
        extra: { rideId, reason },
      });
      return res.json({ ride: populated });
    } catch (e) {
      logAction({
        req,
        action: "Ride cancel (V1) failed",
        file: "routes/rides.js:cancel_v1",
        error: e,
        extra: { rideId: req.body?.rideId },
      });
      next(e);
    }
  },
);

/** Passenger: rate driver after completed ride (once) */
router.post(
  "/rate",
  roleRequired("passenger"),
  validate(rateRideSchema),
  docIdBody("rideId"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating 1–5"),
  body("review").optional().isString().isLength({ max: 300 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId, rating, review } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride || String(ride.passengerId) !== String(req.userId)) {
        throw new AppError("Not found", 404);
      }
      if (ride.status !== "completed") {
        throw new AppError("Ride not completed", 400);
      }
      if (ride.passengerRating != null) {
        throw new AppError("Already rated", 400);
      }
      ride.passengerRating = Number(rating);
      ride.passengerReview = typeof review === "string" ? review.slice(0, 300) : "";
      await ride.save();
      await applyDriverRatingFromRide(ride);
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

/** Driver: rate passenger after completed ride (once) */
router.post(
  "/rate-passenger",
  roleRequired("driver"),
  validate(rateRideSchema),
  docIdBody("rideId"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating 1–5"),
  body("review").optional().isString().isLength({ max: 300 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId, rating, review } = req.body;
      const ride = await Ride.findById(rideId);
      if (!ride || String(ride.driverId) !== String(req.userId)) {
        throw new AppError("Not found", 404);
      }
      if (ride.status !== "completed") {
        throw new AppError("Ride not completed", 400);
      }
      if (ride.driverRating != null) {
        throw new AppError("Already rated", 400);
      }
      ride.driverRating = Number(rating);
      ride.driverReview = typeof review === "string" ? review.slice(0, 300) : "";
      await ride.save();
      await applyPassengerRatingFromRide(ride);
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  },
);

/** Passenger: ratings given by drivers */
router.get("/ratings/given", roleRequired("passenger"), async (req, res, next) => {
  try {
    const rides = await Ride.find({ passengerId: req.userId, status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(60)
      .populate("driverId", "name profileImageUrl");
    const ratings = rides
      .filter((r) => r.driverRating != null)
      .map((r) => {
        const o = r.toJSON ? r.toJSON() : r;
        return {
          rideId: o._id,
          rating: o.driverRating,
          review: o.driverReview || "",
          completedAt: o.completedAt || o.updatedAt,
          driver: o.driverId,
        };
      });
    return res.json({ ratings, summary: { averageRating: null, ratingCount: ratings.length } });
  } catch (e) {
    next(e);
  }
});

/** Driver: ratings received from passengers */
router.get("/ratings/received", roleRequired("driver"), async (req, res, next) => {
  try {
    const rides = await Ride.find({ driverId: req.userId, status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(60)
      .populate("passengerId", "name profileImageUrl");
    const ratings = rides
      .filter((r) => r.passengerRating != null)
      .map((r) => {
        const o = r.toJSON ? r.toJSON() : r;
        return {
          rideId: o._id,
          rating: o.passengerRating,
          review: o.passengerReview || "",
          completedAt: o.completedAt || o.updatedAt,
          passenger: o.passengerId,
        };
      });
    const profile = await DriverProfile.findOne({ userId: req.userId }).lean();
    return res.json({
      ratings,
      summary: {
        averageRating: profile?.rating ?? null,
        ratingCount: profile?.ratingCount ?? ratings.length,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/history",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(["pending", "accepted", "ongoing", "completed", "cancelled"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) throw new AppError("User not found", 401);
      const filter = {};
      const mode = user.role === "admin" ? "admin" : user.active_role || user.role || "passenger";
      if (mode === "passenger") filter.passengerId = req.userId;
      else if (mode === "driver") filter.driverId = req.userId;
      else if (mode !== "admin") throw new AppError("Forbidden", 403);
      if (req.query.status) filter.status = String(req.query.status);
      const { limit, page, skip } = parsePagination(req);
      const [rides, total] = await Promise.all([
        Ride.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("passengerId", "name email profileImageUrl location phone")
          .populate("driverId", "name email profileImageUrl phone vehicleType location")
          .populate(bookingPopulate),
        Ride.countDocuments(filter),
      ]);
      return res.json({
        success: true,
        data: { items: rides, total, page, limit },
      });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  "/:rideId/messages",
  docIdParam("rideId"),
  validate(chatQuerySchema, "query"),
  validateRequest,
  async (req, res, next) => {
    try {
      await getRideAndAssertParticipant(req.params.rideId, req.userId);
      const before = req.query.before;
      const limit = Number(req.query.limit) || 30;
      const messages = await getMessagesByRideId(req.params.rideId, { before, limit });
      return res.json({ messages });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/:rideId/messages",
  docIdParam("rideId"),
  validate(chatMessageSchema),
  body("text").trim().notEmpty().isLength({ max: 2000 }),
  docIdOptionalBody("idempotencyKey"),
  validateRequest,
  async (req, res, next) => {
    try {
      const ride = await getRideAndAssertParticipant(req.params.rideId, req.userId);
      if (!canPostChatMessage(ride, req.userId)) {
        throw new AppError("Cannot send message for this ride", 403);
      }
      const text = String(req.body.text).trim();
      const idempotencyKey = req.body.idempotencyKey;
      const result = await createMessage(req.params.rideId, req.userId, text, idempotencyKey);
      if (result.deduplicated) {
        const existing = await getMessagesByRideId(req.params.rideId, { limit: 50 });
        const msg = existing.find((m) => m._id === result._id) || existing[existing.length - 1];
        return res.status(200).json({ message: msg, deduplicated: true });
      }
      const messages = await getMessagesByRideId(req.params.rideId, { limit: 1 });
      const populated = messages.length > 0 ? messages[messages.length - 1] : { _id: result._id };
      const recipientId = String(req.userId) === String(ride.passengerId) ? ride.driverId : ride.passengerId;
      if (recipientId) {
        const senderName = populated?.senderId?.name || "";
        notifyNewMessage(req.params.rideId, req.userId, senderName, text, recipientId).catch(() => {});
      }
      return res.status(201).json({ message: populated });
    } catch (e) {
      next(e);
    }
  },
);

router.get("/:rideId", docIdParam("rideId"), validateRequest, async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId).populate(ridePopulate);
    if (!ride) throw new AppError("Not found", 404);
    const uid = req.userId.toString();
    const isPassenger = ride.passengerId?._id?.toString() === uid;
    const isAssignedDriver = ride.driverId?._id?.toString() === uid;
    const propDriverId = ride.driverProposal?.driverId?._id?.toString() || ride.driverProposal?.driverId?.toString();
    const isProposingDriver = propDriverId === uid;
    const preId = ride.preassignedDriverId?._id?.toString() || ride.preassignedDriverId?.toString();
    const isPreassignedDriver = ride.awaitingDriverConfirm && preId === uid;
    const isDriver = isAssignedDriver || isProposingDriver || isPreassignedDriver;
    const user = await User.findById(req.userId);
    const isAvailablePending =
      user?.active_role === "driver" &&
      ride.status === "pending" &&
      !ride.driverId &&
      String(ride.vehicleType || "") === String(user?.vehicleType || "");
    if (!isPassenger && !isDriver && !isAvailablePending && user?.role !== "admin") {
      throw new AppError("Forbidden", 403);
    }
    const row = ride?.toObject ? ride.toObject() : ride;
    if (row.passengerId?._id || row.passengerId) {
      const pid = row.passengerId?._id || row.passengerId;
      row.passengerStats = await getPassengerPublicStats(pid);
    }
    return res.json({ ride: row });
  } catch (e) {
    next(e);
  }
});

export default router;
