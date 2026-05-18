import { Router } from "express";
import { body, param } from "express-validator";
import { Ride } from "../models/Ride.js";
import { Booking } from "../models/Booking.js";
import { User } from "../models/User.js";
import { Message } from "../models/Message.js";
import { Vehicle } from "../models/Vehicle.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { requireApprovedDriver } from "../middleware/driverGate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { haversineKm, fareFromVehiclePricing } from "../utils/geo.js";
import { buildRoutePath } from "../utils/directions.js";
import { computeSeatUnits, roundSeatUnits } from "../utils/seatUnits.js";
import { creditDriverForRide } from "../services/walletLedger.js";
import { emitTo, roomRide, roomDrivers } from "../realtime/io.js";

const router = Router();

router.use(authRequired, blockCheck);

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
  const isProposingDriver =
    ride.driverProposal?.driverId && String(ride.driverProposal.driverId) === uid;
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

const rideIdValidators = [
  body("rideId").isMongoId().withMessage("Invalid ride id"),
  validateRequest,
];

/** Passenger: nearby online drivers (optionally filtered by vehicleType query) */
router.get("/nearby-drivers", roleRequired("passenger", "admin"), async (req, res, next) => {
  try {
    const raw = req.query.vehicleType;
    const vt = typeof raw === "string" && raw.trim() ? String(raw).toLowerCase().trim() : null;
    const q = { active_role: "driver", isOnline: true };
    if (vt) q.vehicleType = vt;
    const drivers = await User.find(q).select("name email location isOnline vehicleType");
    return res.json({ drivers, vehicleType: vt });
  } catch (e) {
    next(e);
  }
});

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
  body("passengerMinFare").optional().isFloat({ min: 0 }).toFloat(),
  body("passengerMaxFare").optional().isFloat({ min: 0 }).toFloat(),
  body("passengerCount").optional().isInt({ min: 1, max: 8 }).toInt(),
  body("passengerSize").optional().isIn(["SMALL", "MEDIUM", "LARGE", "XL"]),
  body("passengerGender").optional().isIn(["male", "female", "unspecified"]),
  body("passengerGenderPreference").optional().isIn(["all", "male_only", "female_only"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const vt = String(req.body.vehicleType).toLowerCase().trim();
      const vehicleDoc = await Vehicle.findOne({ typeKey: vt, active: true });
      if (!vehicleDoc) throw new AppError("Invalid vehicle type", 400);

      const isParcel = vt === "shipping";
      if (isParcel) {
        const desc = String(req.body?.parcel?.description || "").trim();
        if (!desc) throw new AppError("parcel.description is required for shipping", 400);
      }

      const passengerCount =
        req.body.passengerCount != null && req.body.passengerCount !== ""
          ? Number(req.body.passengerCount)
          : 1;
      const passengerSize = String(req.body.passengerSize || "MEDIUM")
        .toUpperCase()
        .trim();
      const seatUnits = computeSeatUnits(passengerCount, passengerSize);
      const cap = Number(vehicleDoc.capacity) || 4;
      if (seatUnits > cap) {
        throw new AppError(
          `This booking needs ${seatUnits} seat units but this vehicle capacity is ${cap} units`,
          400
        );
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

      /** Works on standalone MongoDB (no replica-set transactions required). */
      let createdRide;
      try {
        const deliverBy =
          req.body?.parcel?.deliverBy != null && String(req.body.parcel.deliverBy).trim()
            ? new Date(String(req.body.parcel.deliverBy))
            : new Date(Date.now() + etaSeconds * 1000);
        createdRide = await Ride.create({
          passengerId: req.userId,
          pickupLocation: pickup,
          destinationLocation: dest,
          status: "pending",
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
          passengerGenderPolicy:
            req.body.passengerGenderPreference != null
              ? String(req.body.passengerGenderPreference)
              : "all",
        });
        await Booking.create({
          rideId: createdRide._id,
          passengerId: req.userId,
          passengerCount,
          passengerSize,
          seatsReserved: seatUnits,
          passengerGender:
            req.body.passengerGender != null ? String(req.body.passengerGender) : "unspecified",
          status: "confirmed",
        });
      } catch (e) {
        if (createdRide?._id) {
          await Ride.deleteOne({ _id: createdRide._id }).catch(() => {});
        }
        throw e;
      }

      const populated = await populatedRideById(createdRide._id);
      emitTo(roomDrivers(vt), "ride:update", { type: "ride.created", rideId: createdRide._id, ride: populated });
      return res.status(201).json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
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
      const passengerSize = String(req.body.passengerSize || "MEDIUM").toUpperCase().trim();
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
  }
);

/** Passenger: join an accepted pooled ride (atomic seat decrement; prevents overbooking). */
router.post(
  "/join",
  roleRequired("passenger"),
  body("rideId").isMongoId().withMessage("Invalid ride id"),
  body("passengerCount").optional().isInt({ min: 1, max: 8 }).toInt(),
  body("passengerSize").optional().isIn(["SMALL", "MEDIUM", "LARGE", "XL"]),
  body("passengerGender").optional().isIn(["male", "female", "unspecified"]),
  validateRequest,
  async (req, res, next) => {
    try {
      const rideId = String(req.body.rideId);
      const passengerCount = req.body.passengerCount != null ? Number(req.body.passengerCount) : 1;
      const passengerSize = String(req.body.passengerSize || "MEDIUM").toUpperCase().trim();
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
        { new: true }
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
      emitTo(roomRide(rideId), "ride:update", { type: "ride.joined", rideId, ride: populated });
      return res.status(201).json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

/** Driver: pending rides (excludes other drivers' proposals; excludes rides awaiting another driver's confirmation) */
router.get("/available", roleRequired("driver"), requireApprovedDriver, async (req, res, next) => {
  try {
    const driver = await User.findById(req.userId);
    const vt = driver?.vehicleType || "delivery";
    const rides = await Ride.find({
      status: "pending",
      driverId: null,
      vehicleType: vt,
      $and: [
        {
          $or: [
            { awaitingDriverConfirm: { $ne: true } },
            { awaitingDriverConfirm: true, preassignedDriverId: req.userId },
          ],
        },
        {
          $or: [
            { driverProposal: null },
            { "driverProposal.driverId": req.userId },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate(ridePopulate)
      .populate(bookingPopulate);
    return res.json({ rides });
  } catch (e) {
    next(e);
  }
});

/** Driver: submit or update price offer; passenger must accept before trip is assigned */
router.post(
  "/accept",
  roleRequired("driver"),
  requireApprovedDriver,
  body("rideId").isMongoId().withMessage("Invalid ride id"),
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
      // Clean stale proposal if any (so drivers can re-offer cleanly)
      if (isOfferExpired(ride)) {
        ride.driverProposal = null;
      }
      const driver = await User.findById(req.userId);
      const driverProfile = await DriverProfile.findOne({ userId: req.userId }).lean();
      const cars = Array.isArray(driverProfile.cars) ? driverProfile.cars : [];
      const selectedId = driverProfile.selectedCarId ? String(driverProfile.selectedCarId) : null;
      const selectedCar =
        (selectedId && cars.find((c) => String(c?._id) === selectedId)) || cars[0] || null;
      const dType = driver?.vehicleType || "delivery";
      if (String(ride.vehicleType || "delivery") !== String(dType)) {
        throw new AppError("This ride requires a different vehicle class", 403);
      }
      const existing = ride.driverProposal;
      if (existing?.driverId && String(existing.driverId) !== String(req.userId)) {
        throw new AppError("Another driver already has a pending offer on this ride", 409);
      }
      const base = Number(ride.estimatedFare) || 0;
      let proposed =
        req.body.proposedFare != null && req.body.proposedFare !== ""
          ? Number(req.body.proposedFare)
          : base;
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
          carSpec: `${selectedCar?.brand || driverProfile?.carBrand || ""} ${selectedCar?.model || driverProfile?.carModel || ""}`.trim(),
          availableSeats: selectedCar?.seats ?? driverProfile?.numberOfSeats ?? null,
        },
      };
      await ride.save();
      const populated = await populatedRideById(ride._id);
      emitTo(roomRide(ride._id), "ride:update", { type: "ride.offer", rideId: ride._id, ride: populated });
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

/** Driver: withdraw your pending offer (while ride is pending). */
router.post(
  "/withdraw-offer",
  roleRequired("driver"),
  requireApprovedDriver,
  body("rideId").isMongoId().withMessage("Invalid ride id"),
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
      emitTo(roomRide(ride._id), "ride:update", { type: "ride.offerWithdrawn", rideId: ride._id, ride: populated });
      emitTo(roomDrivers(ride.vehicleType), "ride:update", { type: "ride.offerWithdrawn", rideId: ride._id, ride: populated });
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

/** Passenger: accept or reject driver's price */
router.post(
  "/respond-proposal",
  roleRequired("passenger"),
  body("rideId").isMongoId().withMessage("Invalid ride id"),
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
        emitTo(roomRide(ride._id), "ride:update", { type: "ride.offerExpired", rideId: ride._id, ride: populated });
        emitTo(roomDrivers(ride.vehicleType), "ride:update", { type: "ride.offerExpired", rideId: ride._id, ride: populated });
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
        emitTo(roomRide(ride._id), "ride:update", { type: "ride.offerRejected", rideId: ride._id, ride: populated });
        emitTo(roomDrivers(ride.vehicleType), "ride:update", { type: "ride.offerRejected", rideId: ride._id, ride: populated });
        return res.json({ ride: populated });
      }
      const proposed = Number(prop.proposedFare) || 0;
      ride.awaitingDriverConfirm = true;
      ride.preassignedDriverId = prop.driverId;
      ride.preassignedFare = proposed;
      ride.driverProposal = null;
      await ride.save();
      const populated = await populatedRideById(ride._id);
      emitTo(roomRide(ride._id), "ride:update", { type: "ride.offerAccepted", rideId: ride._id, ride: populated });
      emitTo(roomDrivers(ride.vehicleType), "ride:update", { type: "ride.offerAccepted", rideId: ride._id, ride: populated });
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

/** Passenger: update minimum fare while pending (≥ suggested; not while waiting for driver confirm) */
router.post(
  "/passenger-min-fare",
  roleRequired("passenger"),
  body("rideId").isMongoId().withMessage("Invalid ride id"),
  body("passengerMinFare").isFloat({ gt: 0 }).toFloat(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId, passengerMinFare } = req.body;
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
      emitTo(roomRide(ride._id), "ride:update", { type: "ride.passengerMinFare", rideId: ride._id, ride: populated });
      emitTo(roomDrivers(ride.vehicleType), "ride:update", {
        type: "ride.passengerMinFare",
        rideId: ride._id,
        ride: populated,
      });
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

/** Driver: after passenger accepted your price — confirm or reject the trip */
router.post(
  "/driver-confirm-booking",
  roleRequired("driver"),
  requireApprovedDriver,
  body("rideId").isMongoId().withMessage("Invalid ride id"),
  body("accept").isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
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
        emitTo(roomRide(ride._id), "ride:update", { type: "ride.driverConfirmRejected", rideId: ride._id, ride: populated });
        emitTo(roomDrivers(ride.vehicleType), "ride:update", {
          type: "ride.driverConfirmRejected",
          rideId: ride._id,
          ride: populated,
        });
        return res.json({ ride: populated });
      }
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
      emitTo(roomRide(ride._id), "ride:update", { type: "ride.driverConfirmed", rideId: ride._id, ride: populated });
      emitTo(roomDrivers(ride.vehicleType), "ride:update", {
        type: "ride.driverConfirmed",
        rideId: ride._id,
        ride: populated,
      });
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

/** Driver: cancel an accepted ride before it starts (accepted only). */
router.post(
  "/driver-cancel",
  roleRequired("driver"),
  requireApprovedDriver,
  body("rideId").isMongoId().withMessage("Invalid ride id"),
  body("reason").optional({ checkFalsy: true }).isString().trim().isLength({ max: 300 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId } = req.body;
      const reason = String(req.body.reason || "").trim().slice(0, 300);
      const ride = await Ride.findById(rideId);
      if (!ride) throw new AppError("Not found", 404);
      if (String(ride.driverId || "") !== String(req.userId)) throw new AppError("Not your ride", 403);
      if (ride.status !== "accepted") throw new AppError("Ride cannot be cancelled at this stage", 400);
      // Pooling: prevent cancelling if other passengers joined
      const others = await Booking.countDocuments({
        rideId,
        status: "confirmed",
        passengerId: { $ne: ride.passengerId },
      });
      if (others > 0) throw new AppError("Cannot cancel a pooled ride with other passengers", 409);

      ride.status = "cancelled";
      ride.cancelledAt = new Date();
      ride.cancelledBy = "driver";
      ride.cancelReason = reason;
      await ride.save();
      const populated = await populatedRideById(ride._id);
      emitTo(roomRide(ride._id), "ride:update", { type: "ride.cancelled", rideId: ride._id, ride: populated });
      emitTo(roomDrivers(ride.vehicleType), "ride:update", { type: "ride.cancelled", rideId: ride._id, ride: populated });
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

router.post("/start", roleRequired("driver"), requireApprovedDriver, ...rideIdValidators, async (req, res, next) => {
  try {
    const { rideId } = req.body;
    const ride = await Ride.findById(rideId);
    if (!ride || ride.driverId?.toString() !== req.userId) {
      throw new AppError("Not your ride", 403);
    }
    // Idempotent: if already ongoing, just return current ride.
    if (ride.status === "ongoing") {
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    }
    if (ride.status !== "accepted") {
      throw new AppError("Ride must be accepted first", 400);
    }
    ride.status = "ongoing";
    ride.startedAt = new Date();
    await ride.save();
    const populated = await populatedRideById(ride._id);
    emitTo(roomRide(ride._id), "ride:update", { type: "ride.started", rideId: ride._id, ride: populated });
    emitTo(roomDrivers(ride.vehicleType), "ride:update", { type: "ride.started", rideId: ride._id, ride: populated });
    return res.json({ ride: populated });
  } catch (e) {
    next(e);
  }
});

router.post("/end", roleRequired("driver"), requireApprovedDriver, ...rideIdValidators, async (req, res, next) => {
  try {
    const { rideId } = req.body;
    const ride = await Ride.findById(rideId);
    if (!ride || ride.driverId?.toString() !== req.userId) {
      throw new AppError("Not your ride", 403);
    }
    // Idempotent: if already completed, return current ride.
    if (ride.status === "completed") {
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    }
    if (ride.status !== "ongoing") {
      throw new AppError("Ride must be ongoing", 400);
    }
    ride.status = "completed";
    ride.completedAt = new Date();
    const agreed = ride.agreedFare != null ? Number(ride.agreedFare) : null;
    ride.fare =
      agreed != null && !Number.isNaN(agreed)
        ? agreed
        : Number(ride.passengerMinFare ?? ride.estimatedFare) || 0;
    await ride.save();
    try {
      if (ride.driverId) {
        await creditDriverForRide(ride.driverId, ride._id, ride.fare);
      }
    } catch (ledgerErr) {
      console.error("wallet creditDriverForRide", ledgerErr);
    }
    const populated = await populatedRideById(ride._id);
    emitTo(roomRide(ride._id), "ride:update", { type: "ride.completed", rideId: ride._id, ride: populated });
    emitTo(roomDrivers(ride.vehicleType), "ride:update", { type: "ride.completed", rideId: ride._id, ride: populated });
    return res.json({ ride: populated });
  } catch (e) {
    next(e);
  }
});

/** Passenger: cancel ride before it starts (pending/accepted only). */
router.post(
  "/cancel",
  roleRequired("passenger"),
  body("rideId").isMongoId().withMessage("Invalid ride id"),
  body("reason").optional({ checkFalsy: true }).isString().trim().isLength({ max: 300 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { rideId } = req.body;
      const reason = String(req.body.reason || "").trim().slice(0, 300);
      const ride = await Ride.findById(rideId);
      if (!ride) throw new AppError("Not found", 404);
      if (String(ride.passengerId) !== String(req.userId)) throw new AppError("Forbidden", 403);
      if (ride.status !== "pending" && ride.status !== "accepted") {
        throw new AppError("Ride cannot be cancelled at this stage", 400);
      }
      if (ride.status === "accepted") {
        // Pooling: prevent cancelling the whole ride if other confirmed bookings exist.
        const others = await Booking.countDocuments({
          rideId,
          status: "confirmed",
          passengerId: { $ne: req.userId },
        });
        if (others > 0) {
          throw new AppError("Cannot cancel a pooled ride with other passengers", 409);
        }
      }
      ride.status = "cancelled";
      ride.cancelledAt = new Date();
      ride.cancelledBy = "passenger";
      ride.cancelReason = reason;
      // Release any pending proposal/assignment
      ride.driverProposal = null;
      ride.awaitingDriverConfirm = false;
      ride.preassignedDriverId = null;
      ride.preassignedFare = null;
      await ride.save();
      const populated = await populatedRideById(ride._id);
      emitTo(roomRide(ride._id), "ride:update", { type: "ride.cancelled", rideId: ride._id, ride: populated });
      emitTo(roomDrivers(ride.vehicleType), "ride:update", { type: "ride.cancelled", rideId: ride._id, ride: populated });
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

/** Passenger: rate driver after completed ride (once) */
router.post(
  "/rate",
  roleRequired("passenger"),
  body("rideId").isMongoId().withMessage("Invalid ride id"),
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
      const populated = await populatedRideById(ride._id);
      return res.json({ ride: populated });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/history", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new AppError("User not found", 401);
    let query = {};
    const mode = user.role === "admin" ? "admin" : (user.active_role || user.role || "passenger");
    if (mode === "passenger") query = { passengerId: req.userId };
    else if (mode === "driver") query = { driverId: req.userId };
    else if (mode === "admin") query = {};
    else throw new AppError("Forbidden", 403);

    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("passengerId", "name email profileImageUrl location phone")
      .populate("driverId", "name email profileImageUrl phone vehicleType location")
      .populate(bookingPopulate);
    return res.json({ rides });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/:rideId/messages",
  param("rideId").isMongoId().withMessage("Invalid ride id"),
  validateRequest,
  async (req, res, next) => {
    try {
      await getRideAndAssertParticipant(req.params.rideId, req.userId);
      const messages = await Message.find({ rideId: req.params.rideId })
        .sort({ createdAt: 1 })
        .limit(300)
        .populate("senderId", "name role");
      return res.json({ messages });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/:rideId/messages",
  param("rideId").isMongoId().withMessage("Invalid ride id"),
  body("text").trim().notEmpty().isLength({ max: 2000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const ride = await getRideAndAssertParticipant(req.params.rideId, req.userId);
      if (!canPostChatMessage(ride, req.userId)) {
        throw new AppError("Cannot send message for this ride", 403);
      }
      const msg = await Message.create({
        rideId: ride._id,
        senderId: req.userId,
        text: String(req.body.text).trim(),
      });
      const populated = await Message.findById(msg._id).populate("senderId", "name role");
      emitTo(roomRide(ride._id), "ride:message", { rideId: String(ride._id), message: populated });
      return res.status(201).json({ message: populated });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  "/:rideId",
  param("rideId").isMongoId().withMessage("Invalid ride id"),
  validateRequest,
  async (req, res, next) => {
    try {
      const ride = await Ride.findById(req.params.rideId).populate(ridePopulate);
      if (!ride) throw new AppError("Not found", 404);
      const uid = req.userId.toString();
      const isPassenger = ride.passengerId?._id?.toString() === uid;
      const isAssignedDriver = ride.driverId?._id?.toString() === uid;
      const propDriverId =
        ride.driverProposal?.driverId?._id?.toString() || ride.driverProposal?.driverId?.toString();
      const isProposingDriver = propDriverId === uid;
      const preId =
        ride.preassignedDriverId?._id?.toString() || ride.preassignedDriverId?.toString();
      const isPreassignedDriver = ride.awaitingDriverConfirm && preId === uid;
      const isDriver = isAssignedDriver || isProposingDriver || isPreassignedDriver;
      const user = await User.findById(req.userId);
      if (!isPassenger && !isDriver && user?.role !== "admin") {
        throw new AppError("Forbidden", 403);
      }
      return res.json({ ride });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
