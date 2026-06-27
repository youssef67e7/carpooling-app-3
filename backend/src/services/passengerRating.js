import { Ride } from "../models/Ride.js";

/** Recompute passenger average from all driver ratings on completed rides. */
export async function refreshPassengerRatingAggregate(passengerId) {
  if (!passengerId) return null;
  const id = String(passengerId);
  const rides = await Ride.find({ passengerId: id, status: "completed" });
  const rated = rides.filter((r) => r.driverRating != null);
  if (!rated.length) return null;

  const sum = rated.reduce((acc, r) => acc + Number(r.driverRating || 0), 0);
  const avg = Math.round((sum / rated.length) * 10) / 10;

  return { rating: avg, ratingCount: rated.length };
}

export async function applyPassengerRatingFromRide(ride) {
  if (!ride?.passengerId || ride.driverRating == null) return null;
  return refreshPassengerRatingAggregate(ride.passengerId);
}
