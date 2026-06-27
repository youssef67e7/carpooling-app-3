import { Ride } from "../models/Ride.js";
import { AppError } from "../errors/AppError.js";

/** Max simultaneous assigned trips per driver (accepted + ongoing). */
export const MAX_DRIVER_CONCURRENT_RIDES = 2;

const ASSIGNED_STATUSES = ["accepted", "ongoing"];

export async function countDriverAssignedRides(driverId, { excludeRideId } = {}) {
  const filter = {
    driverId,
    status: { $in: ASSIGNED_STATUSES },
  };
  if (excludeRideId) filter._id = { $ne: excludeRideId };
  return Ride.countDocuments(filter);
}

export async function assertDriverCanTakeAnotherRide(driverId, { excludeRideId } = {}) {
  const n = await countDriverAssignedRides(driverId, { excludeRideId });
  if (n >= MAX_DRIVER_CONCURRENT_RIDES) {
    throw new AppError(`You can have at most ${MAX_DRIVER_CONCURRENT_RIDES} active rides at the same time`, 409);
  }
  return n;
}
