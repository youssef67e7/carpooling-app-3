import {
  createRide,
  findRideById,
  findActiveRideByPassenger,
  updateRideStatus,
  findNearbyAvailableDrivers,
} from "../mongo/queries/rides.js";
import { findById } from "../mongo/queries/users.js";
import { getDb } from "../mongo/nativeClient.js";
import { getCollection } from "../mongo/client.js";
import { User } from "../models/User.js";

export async function requestRide(passengerId, pickup, dropoff, vehicleType) {
  const existing = await findActiveRideByPassenger(passengerId);
  if (existing) {
    throw new Error("User already has an active ride");
  }

  const nearbyDrivers = await findNearbyAvailableDrivers(pickup.latitude, pickup.longitude, vehicleType, 5000);

  const rideId = await createRide({
    passenger_id: passengerId,
    pickup: {
      address: pickup.address,
      coordinates: [pickup.longitude, pickup.latitude],
    },
    dropoff: {
      address: dropoff.address,
      coordinates: [dropoff.longitude, dropoff.latitude],
    },
    vehicle_type: vehicleType,
    status: "pending",
    created_at: new Date(),
  });

  const ride = await findRideById(rideId.toString());
  return { ride, nearbyDrivers };
}

export async function getRideStatus(rideId) {
  const ride = await findRideById(rideId);
  if (!ride) {
    throw new Error("Ride not found");
  }
  return ride;
}

export async function getRequestedRides(vehicleType) {
  const db = await getDb();
  return db.collection("rides").find({ status: "pending" }).sort({ created_at: -1 }).limit(20).toArray();
}

export async function acceptRide(rideId, driverId) {
  // Enforce break mode / offline status at the service layer
  const driver = await User.findById(driverId).select("isOnline").lean();
  if (!driver?.isOnline) throw new Error("Driver is offline");

  const { matched } = await updateRideStatus(
    rideId,
    "accepted",
    { driver_id: driverId, driverId, accepted_at: new Date() },
    { currentStatus: "pending" },
  );
  if (!matched) {
    const ride = await findRideById(rideId);
    if (!ride) throw new Error("Ride not found");
    if (ride.driverId && String(ride.driverId) === String(driverId)) {
      return ride;
    }
    throw new Error("Ride is no longer available");
  }
  return findRideById(rideId);
}
