import { getDb } from "../nativeClient.js";
import { ObjectId } from "mongodb";

const RIDES = "rides";
const DRIVERS = "driver_profiles";

/**
 * Haversine distance between two lat/lng points in meters.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Inserts a new ride document.
 * @param {object} rideData
 * @returns {Promise<import("mongodb").InsertedId>}
 */
export async function createRide(rideData) {
  const db = await getDb();
  const result = await db.collection(RIDES).insertOne(rideData);
  return result.insertedId;
}

/**
 * Finds a ride by _id.
 * @param {string} rideId
 * @returns {Promise<object|null>}
 */
export async function findRideById(rideId) {
  const db = await getDb();
  return db.collection(RIDES).findOne({ _id: new ObjectId(rideId) });
}

/**
 * Finds the active ride for a passenger.
 * @param {string} passengerId
 * @returns {Promise<object|null>}
 */
export async function findActiveRideByPassenger(passengerId) {
  const db = await getDb();
  return db.collection(RIDES).findOne({
    passenger_id: passengerId,
    status: { $in: ["pending", "accepted", "ongoing"] },
  });
}

/**
 * Updates ride status and optional extra fields via $set.
 * @param {string} rideId
 * @param {string} newStatus
 * @param {object} [extraFields={}]
 * @returns {Promise<void>}
 */
export async function updateRideStatus(rideId, newStatus, extraFields = {}) {
  const db = await getDb();
  await db.collection(RIDES).updateOne(
    { _id: new ObjectId(rideId) },
    { $set: { status: newStatus, ...extraFields } }
  );
}

/**
 * Finds nearby available drivers using in-memory Haversine distance.
 * Compatible with MongoDB Atlas M0 (no $geoNear).
 *
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {string} vehicleType
 * @param {number} maxDistanceMeters
 * @returns {Promise<object[]>}
 */
export async function findNearbyAvailableDrivers(
  pickupLat,
  pickupLng,
  vehicleType,
  maxDistanceMeters
) {
  const db = await getDb();

  const candidates = await db
    .collection(DRIVERS)
    .find({
      is_online: true,
      is_approved: true,
      vehicle_type: vehicleType,
    })
    .limit(50)
    .toArray();

  const results = [];

  for (const driver of candidates) {
    const loc = driver.current_location;
    if (!loc || !Array.isArray(loc.coordinates) || loc.coordinates.length < 2) continue;

    const [driverLng, driverLat] = loc.coordinates;
    const dist = haversineDistance(pickupLat, pickupLng, driverLat, driverLng);

    if (dist <= maxDistanceMeters) {
      results.push({ ...driver, distance_meters: Math.round(dist) });
    }
  }

  results.sort((a, b) => a.distance_meters - b.distance_meters);
  return results;
}
