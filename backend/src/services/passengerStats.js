import { nativeCount } from "../mongo/nativeQuery.js";

const cache = new Map();
const CACHE_TTL = 60_000;

export async function getPassengerPublicStats(passengerId) {
  const key = String(passengerId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const [totalRides, completedRides] = await Promise.all([
    nativeCount("rides", { passengerId: key }),
    nativeCount("rides", { passengerId: key, status: "completed" }),
  ]);

  const result = { totalRides, completedRides };
  cache.set(key, { data: result, ts: Date.now() });
  if (cache.size > 1000) cache.clear();
  return result;
}

export async function enrichRidesWithPassengerStats(rides) {
  if (!rides.length) return rides;
  const ids = [...new Set(rides.map((r) => String(r.passengerId || r.passenger_id || "")).filter(Boolean))];
  if (!ids.length) return rides;

  const statsMap = new Map();
  await Promise.all(
    ids.map(async (id) => {
      statsMap.set(id, await getPassengerPublicStats(id));
    }),
  );

  return rides.map((ride) => ({
    ...ride,
    passengerStats: statsMap.get(String(ride.passengerId || ride.passenger_id)) || { totalRides: 0, completedRides: 0 },
  }));
}
