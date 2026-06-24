import { DriverProfile } from "../models/DriverProfile.js";
import { Ride } from "../models/Ride.js";

/** Recompute driver average from all rated completed rides. */
export async function refreshDriverRatingAggregate(driverId) {
  if (!driverId) return null;
  const id = String(driverId);
  const rides = await Ride.find({ driverId: id, status: "completed" });
  const rated = rides.filter((r) => r.passengerRating != null);
  if (!rated.length) return null;

  const sum = rated.reduce((acc, r) => acc + Number(r.passengerRating || 0), 0);
  const avg = Math.round((sum / rated.length) * 10) / 10;

  await DriverProfile.updateOne(
    { userId: id },
    { $set: { rating: avg, ratingCount: rated.length } },
    { upsert: true }
  );
  return { rating: avg, ratingCount: rated.length };
}

export async function applyDriverRatingFromRide(ride) {
  if (!ride?.driverId || ride.passengerRating == null) return null;
  return refreshDriverRatingAggregate(ride.driverId);
}

export async function globalRatingStats() {
  const rides = await Ride.find({ status: "completed" });
  const rated = rides.filter((r) => r.passengerRating != null);
  if (!rated.length) {
    return { averageRating: 0, totalRatings: 0 };
  }
  const sum = rated.reduce((acc, r) => acc + Number(r.passengerRating || 0), 0);
  return {
    averageRating: Math.round((sum / rated.length) * 10) / 10,
    totalRatings: rated.length,
  };
}
