import { connectMongo, getDb, closeMongo } from "../src/mongo/client.js";

const indexes = {
  rides: [
    { key: { status: 1 }, name: "idx_rides_status" },
    { key: { passengerId: 1 }, name: "idx_rides_passengerId" },
    { key: { driverId: 1 }, name: "idx_rides_driverId" },
    { key: { createdAt: -1 }, name: "idx_rides_createdAt" },
    { key: { vehicleType: 1 }, name: "idx_rides_vehicleType" },
    { key: { status: 1, vehicleType: 1 }, name: "idx_rides_status_vehicleType" },
    { key: { driverId: 1, status: 1 }, name: "idx_rides_driverId_status" },
    { key: { passengerId: 1, status: 1 }, name: "idx_rides_passengerId_status" },
  ],
  users: [
    { key: { email: 1 }, unique: true, sparse: true, name: "idx_users_email" },
    { key: { phone: 1 }, sparse: true, name: "idx_users_phone" },
    { key: { googleSub: 1 }, unique: true, sparse: true, name: "idx_users_googleSub" },
    { key: { firebaseUid: 1 }, unique: true, sparse: true, name: "idx_users_firebaseUid" },
    { key: { active_role: 1 }, name: "idx_users_active_role" },
    { key: { isOnline: 1 }, name: "idx_users_isOnline" },
    { key: { active_role: 1, isOnline: 1 }, name: "idx_users_active_role_online" },
  ],
  driver_profiles: [
    { key: { userId: 1 }, unique: true, name: "idx_driverProfiles_userId" },
  ],
  bookings: [
    { key: { rideId: 1 }, name: "idx_bookings_rideId" },
    { key: { passengerId: 1 }, name: "idx_bookings_passengerId" },
    { key: { rideId: 1, status: 1 }, name: "idx_bookings_rideId_status" },
  ],
  refreshTokens: [
    { key: { tokenHash: 1 }, unique: true, name: "idx_refreshTokens_tokenHash" },
    { key: { userId: 1 }, name: "idx_refreshTokens_userId" },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "idx_refreshTokens_expiresAt_ttl" },
  ],
  fcmTokens: [
    { key: { token: 1 }, unique: true, name: "idx_fcmTokens_token" },
    { key: { userId: 1 }, name: "idx_fcmTokens_userId" },
  ],
  messages: [
    { key: { rideId: 1, createdAt: 1 }, name: "idx_messages_rideId_createdAt" },
  ],
};

async function initIndexes() {
  console.log("Connecting to MongoDB...");
  await connectMongo();
  const db = getDb();

  let total = 0;
  let errors = 0;

  for (const [collection, specs] of Object.entries(indexes)) {
    try {
      const result = await db.collection(collection).createIndexes(specs);
      console.log(`  ${collection}: ${result.length} indexes created`);
      total += result.length;
    } catch (err) {
      console.error(`  ${collection}: FAILED — ${err.message}`);
      errors += 1;
    }
  }

  console.log(`\nDone. ${total} indexes created across ${Object.keys(indexes).length} collections.`);
  if (errors) console.log(`${errors} collection(s) had errors.`);

  await closeMongo();
  process.exit(errors ? 1 : 0);
}

initIndexes();
