/** MongoDB collection names (snake_case) — mirrors backend models. */

export const MONGO_COLLECTIONS = [
  { id: "users", model: "User", description: "Accounts (passenger, driver, admin)" },
  { id: "passenger_profiles", model: "PassengerProfile", description: "Passenger profile rows" },
  { id: "driver_profiles", model: "DriverProfile", description: "Driver onboarding & vehicle" },
  { id: "driver_documents", model: "DriverDocuments", description: "ID / criminal record uploads" },
  { id: "admin_accounts", model: "AdminAccount", description: "Fixed admin login (bcrypt)" },
  { id: "phone_login_otps", model: "PhoneLoginOtp", description: "Phone OTP hashes (TTL)" },
  { id: "email_password_reset_otps", model: "EmailPasswordResetOtp", description: "Email password reset OTP hashes (TTL)" },
  { id: "vehicles", model: "Vehicle", description: "Ride service types & pricing" },
  { id: "rides", model: "Ride", description: "Trip requests & lifecycle" },
  { id: "bookings", model: "Booking", description: "Seat pooling bookings" },
  { id: "messages", model: "Message", description: "Ride chat messages" },
  { id: "wallet_accounts", model: "WalletAccount", description: "User wallets" },
  { id: "transactions", model: "Transaction", description: "Wallet ledger" },
  { id: "withdrawal_requests", model: "WithdrawalRequest", description: "Withdraw OTP flow" },
  { id: "reports", model: "Report", description: "User reports" },
  { id: "admin_audit_logs", model: "AdminAuditLog", description: "Admin action audit" },
];

export const MONGO_SCHEMA_VERSION = 1;

/**
 * Write schema metadata to MongoDB.
 */
export async function initMongoCloud(getDb, { dbName }) {
  const db = getDb();
  const now = new Date().toISOString();

  await db.collection("_meta").replaceOne(
    { _id: "schema" },
    {
      _id: "schema",
      version: MONGO_SCHEMA_VERSION,
      dbName: dbName || process.env.MONGODB_DB_NAME || "weret",
      collections: MONGO_COLLECTIONS.map((c) => c.id),
      collectionDetails: MONGO_COLLECTIONS,
      access: "backend-only",
      rules: "clients use REST API",
      updatedAt: now,
    },
    { upsert: true }
  );

  return db.collection("_meta").findOne({ _id: "schema" });
}

export async function countMongoCollections(getDb) {
  const db = getDb();
  const counts = {};
  for (const { id } of MONGO_COLLECTIONS) {
    counts[id] = await db.collection(id).countDocuments();
  }
  counts._meta = await db.collection("_meta").countDocuments();
  return counts;
}

export async function ensureMongoIndexes(getDb) {
  const db = getDb();
  await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });
  await db.collection("users").createIndex({ google_sub: 1 }, { unique: true, sparse: true });
  await db.collection("rides").createIndex({ passenger_id: 1 });
  await db.collection("rides").createIndex({ driver_id: 1 });
  await db.collection("wallet_accounts").createIndex({ user_id: 1 });
  await db.collection("transactions").createIndex({ user_id: 1, created_at: -1 });

  // 2dsphere geo indexes
  await db
    .collection("driverProfiles")
    .createIndex({ currentLocation: "2dsphere" }, { name: "driverLocation_2dsphere", background: true })
    .catch((err) => console.error("[indexes] driverProfiles.2dsphere:", err.message));

  await db
    .collection("rides")
    .createIndex(
      { status: 1, "pickup.coordinates": "2dsphere", poolSeats: 1 },
      { name: "rides_poolMatching_compound", background: true }
    )
    .catch((err) => console.error("[indexes] rides.poolMatching:", err.message));

  // New collection indexes
  await db
    .collection("refreshTokens")
    .createIndex({ userId: 1 })
    .catch((err) => console.error("[indexes] refreshTokens.userId:", err.message));
  await db
    .collection("refreshTokens")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 604800 })
    .catch((err) => console.error("[indexes] refreshTokens.expiresAt:", err.message));

  await db
    .collection("fcmTokens")
    .createIndex({ userId: 1 })
    .catch((err) => console.error("[indexes] fcmTokens.userId:", err.message));
  await db
    .collection("fcmTokens")
    .createIndex({ token: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] fcmTokens.token:", err.message));
  await db
    .collection("fcmTokens")
    .createIndex({ createdAt: 1 })
    .catch((err) => console.error("[indexes] fcmTokens.createdAt:", err.message));

  await db
    .collection("notifications")
    .createIndex({ userId: 1, createdAt: -1 })
    .catch((err) => console.error("[indexes] notifications.userId+createdAt:", err.message));
  await db
    .collection("notifications")
    .createIndex({ userId: 1, read: 1 })
    .catch((err) => console.error("[indexes] notifications.userId+read:", err.message));

  // Additional indexes for query performance & data integrity
  await db
    .collection("users")
    .createIndex({ firebaseUid: 1 }, { unique: true, sparse: true })
    .catch((err) => console.error("[indexes] users.firebaseUid:", err.message));
  await db
    .collection("users")
    .createIndex({ role: 1 })
    .catch((err) => console.error("[indexes] users.role:", err.message));

  await db
    .collection("driverProfiles")
    .createIndex({ userId: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] driverProfiles.userId:", err.message));
  await db
    .collection("driverProfiles")
    .createIndex({ isOnline: 1, isAvailable: 1 })
    .catch((err) => console.error("[indexes] driverProfiles.isOnline+isAvailable:", err.message));

  await db
    .collection("rides")
    .createIndex({ passenger_id: 1, status: 1 })
    .catch((err) => console.error("[indexes] rides.passenger_id+status:", err.message));
  await db
    .collection("rides")
    .createIndex({ driver_id: 1, status: 1 })
    .catch((err) => console.error("[indexes] rides.driver_id+status:", err.message));

  await db
    .collection("refreshTokens")
    .createIndex({ tokenHash: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] refreshTokens.tokenHash:", err.message));

  await db
    .collection("phoneLoginOtps")
    .createIndex({ phone: 1 })
    .catch((err) => console.error("[indexes] phoneLoginOtps.phone:", err.message));
  await db
    .collection("phoneLoginOtps")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 300 })
    .catch((err) => console.error("[indexes] phoneLoginOtps.expiresAt TTL:", err.message));

  await db
    .collection("emailPasswordResetOtps")
    .createIndex({ email: 1 })
    .catch((err) => console.error("[indexes] emailPasswordResetOtps.email:", err.message));
  await db
    .collection("emailPasswordResetOtps")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 300 })
    .catch((err) => console.error("[indexes] emailPasswordResetOtps.expiresAt TTL:", err.message));

  await db
    .collection("adminAuditLogs")
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
    .catch((err) => console.error("[indexes] adminAuditLogs.createdAt TTL:", err.message));

  await db
    .collection("messages")
    .createIndex({ rideId: 1, createdAt: 1 })
    .catch((err) => console.error("[indexes] messages.rideId+createdAt:", err.message));

  await db
    .collection("bookings")
    .createIndex({ rideId: 1 })
    .catch((err) => console.error("[indexes] bookings.rideId:", err.message));
}
