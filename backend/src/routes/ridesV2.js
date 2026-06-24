import { Router } from "express";
import { ObjectId } from "mongodb";
import { requestRide, getRideStatus, getRequestedRides, acceptRide } from "../services/rideNativeService.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { passengerId, pickup, dropoff, vehicleType } = req.body;
    if (!passengerId || !pickup || !dropoff || !vehicleType) {
      return res.status(400).json({ success: false, error: { code: "RIDE_ERROR", message: "passengerId, pickup, dropoff, and vehicleType are required" } });
    }
    const result = await requestRide(passengerId, pickup, dropoff, vehicleType);
    return res.status(201).json({ success: true, data: { ride: result.ride, nearbyDrivers: result.nearbyDrivers.length } });
  } catch (err) {
    const status = err.message === "User already has an active ride" ? 400 : 500;
    return res.status(status).json({ success: false, error: { code: "RIDE_ERROR", message: err.message } });
  }
});

router.get("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: { code: "RIDE_ERROR", message: "Invalid ride ID" } });
    }
    const result = await getRideStatus(id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const status = err.message.toLowerCase().includes("not found") ? 404 : 500;
    return res.status(status).json({ success: false, error: { code: "RIDE_ERROR", message: err.message } });
  }
});

router.get("/requested", async (req, res) => {
  try {
    const vehicleType = req.query.vehicleType;
    const result = await getRequestedRides(vehicleType);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: "RIDE_ERROR", message: err.message } });
  }
});

router.post("/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    if (!driverId) {
      return res.status(400).json({ success: false, error: { code: "RIDE_ERROR", message: "driverId is required" } });
    }
    const result = await acceptRide(id, driverId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const msg = err.message.toLowerCase();
    let status = 500;
    if (msg.includes("not found")) status = 404;
    else if (msg.includes("no longer available")) status = 409;
    return res.status(status).json({ success: false, error: { code: "RIDE_ERROR", message: err.message } });
  }
});

export default router;
