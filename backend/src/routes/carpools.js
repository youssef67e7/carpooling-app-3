import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { DriverProfile } from "../models/DriverProfile.js";
import { Booking } from "../models/Booking.js";
import { Carpool as CarpoolModel } from "../models/Carpool.js";

export const router = Router();

router.post("/create", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      return res.status(403).json({ error: "Only drivers can create carpools" });
    }
    const { origin, destination, departureTime, flexibleMinutes, repeatDays, seatsOffered, notes, vehicleType } = req.body;
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng || !departureTime) {
      return res.status(400).json({ error: "origin, destination, and departureTime required" });
    }
    if (!seatsOffered || seatsOffered < 1 || seatsOffered > 6) {
      return res.status(400).json({ error: "seatsOffered must be 1-6" });
    }
    const carpool = await CarpoolModel.create({
      driverId: req.user._id,
      route: {
        origin: { lat: origin.lat, lng: origin.lng, address: origin.address || "" },
        destination: { lat: destination.lat, lng: destination.lng, address: destination.address || "" },
      },
      departureTime: new Date(departureTime),
      flexibleMinutes: flexibleMinutes || 15,
      repeatDays: Array.isArray(repeatDays) ? repeatDays : [],
      seatsOffered,
      seatsAvailable: seatsOffered,
      notes: (notes || "").slice(0, 500),
      vehicleType: vehicleType || "car_standard",
      status: "active",
    });
    res.status(201).json({ carpool });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/search", authenticate, async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng, maxDetourKm, date } = req.query;
    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: "originLat, originLng, destLat, destLng required" });
    }
    const maxDetour = parseFloat(maxDetourKm) || 3;
    const now = date ? new Date(date) : new Date();
    const carpools = await CarpoolModel.find({ status: "active", seatsAvailable: { $gt: 0 } })
      .populate("driverId", "name email profileImageUrl")
      .sort({ departureTime: 1 })
      .lean();
    const nearby = carpools.filter((c) => {
      const oLat = c.route?.origin?.lat;
      const oLng = c.route?.origin?.lng;
      const dLat = c.route?.destination?.lat;
      const dLng = c.route?.destination?.lng;
      if (!oLat || !oLng || !dLat || !dLng) return false;
      const originDist = haversine(parseFloat(originLat), parseFloat(originLng), oLat, oLng);
      const destDist = haversine(parseFloat(destLat), parseFloat(destLng), dLat, dLng);
      return originDist <= maxDetour && destDist <= maxDetour;
    });
    const driverIds = nearby.map((c) => c.driverId._id);
    const profiles = await DriverProfile.find({ userId: { $in: driverIds } })
      .select("rating ratingCount selectedCarId cars")
      .lean();
    const profileMap = Object.fromEntries(profiles.map((p) => [String(p.userId), p]));
    const enriched = nearby.map((c) => {
      const profile = profileMap[String(c.driverId._id)];
      const car = profile?.cars?.find((cc) => cc._id.toString() === String(profile.selectedCarId)) || profile?.cars?.[0];
      return {
        ...c,
        driverProfile: {
          rating: profile?.rating || 0,
          ratingCount: profile?.ratingCount || 0,
          carModel: car?.model || "",
          carColor: car?.color || "",
          plateNumber: car?.plateNumber || "",
        },
      };
    });
    res.json({ carpools: enriched });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/mine", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const asDriver = await CarpoolModel.find({ driverId: userId })
      .sort({ departureTime: -1 })
      .populate("driverId", "name email profileImageUrl")
      .lean();
    const asPassenger = await Booking.find({ passengerId: userId })
      .populate({ path: "rideId", populate: { path: "driverId", select: "name email profileImageUrl" } })
      .lean();
    res.json({
      asDriver: asDriver.map((c) => ({ ...c, role: "driver" })),
      asPassenger: asPassenger.map((b) => ({ booking: b, role: "passenger" })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/:id/book", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const seats = Math.max(1, Math.min(6, parseInt(req.body.seats) || 1));
    const carpool = await CarpoolModel.findById(id);
    if (!carpool) return res.status(404).json({ error: "Carpool not found" });
    if (carpool.status !== "active") return res.status(400).json({ error: "Carpool is not active" });
    if (carpool.driverId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot book your own carpool" });
    }
    if (carpool.seatsAvailable < seats) {
      return res.status(400).json({ error: `Only ${carpool.seatsAvailable} seats available` });
    }
    carpool.seatsAvailable -= seats;
    await carpool.save();
    const booking = await Booking.create({ rideId: id, passengerId: req.user._id, passengerCount: seats, status: "confirmed" });
    res.status(201).json({ message: "Booked", booking, seatsAvailable: carpool.seatsAvailable });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const carpool = await CarpoolModel.findById(id);
    if (!carpool) return res.status(404).json({ error: "Carpool not found" });
    if (carpool.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the driver can cancel this carpool" });
    }
    carpool.status = "cancelled";
    await carpool.save();
    res.json({ message: "Carpool cancelled" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
