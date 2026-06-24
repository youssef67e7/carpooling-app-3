import { Ride } from "../models/Ride.js";

const statsCache = new Map();
const CACHE_MS = 60_000;

/** Passenger public stats from MongoDB rides collection. */
export async function getPassengerPublicStats(passengerId) {
  const id = String(passengerId || "");
  if (!id || id === "null" || id === "undefined") {
    return { completedRides: 0, averageRating: null };
  }

  const cached = statsCache.get(id);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const completedRides = await Ride.countDocuments({ passengerId: id, status: "completed" });
  const data = { completedRides, averageRating: completedRides > 0 ? null : null };
  statsCache.set(id, { at: Date.now(), data });
  return data;
}

export async function enrichRidesWithPassengerStats(rides) {
  const list = Array.isArray(rides) ? rides : [];
  const out = [];
  for (const ride of list) {
    const row = ride?.toObject ? ride.toObject() : { ...ride };
    const pid = row.passengerId?._id || row.passengerId;
    if (pid) {
      row.passengerStats = await getPassengerPublicStats(pid);
    }
    out.push(row);
  }
  return out;
}
