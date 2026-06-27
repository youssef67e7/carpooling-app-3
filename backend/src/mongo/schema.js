/** MongoDB collection names (snake_case) — mirrors backend models. */

export const MONGO_COLLECTIONS = [
  { id: "users", model: "User", description: "Accounts (passenger, driver, admin)" },
  { id: "passenger_profiles", model: "PassengerProfile", description: "Passenger profile rows" },
  { id: "driver_profiles", model: "DriverProfile", description: "Driver onboarding & vehicle" },
  { id: "driver_documents", model: "DriverDocuments", description: "ID / criminal record uploads" },
  { id: "admin_accounts", model: "AdminAccount", description: "Fixed admin login (bcrypt)" },

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
  { id: "email_login_otps", model: "EmailLoginOtp", description: "Email OTP hashes (TTL)" },
  { id: "safety_events", model: "SafetyEvent", description: "SOS/emergency events" },
  { id: "driver_bonuses", model: "DriverBonus", description: "Driver bonus records" },
  { id: "favorite_drivers", model: "FavoriteDriver", description: "Passenger's favorite drivers" },
  { id: "carpools", model: "Carpool", description: "Scheduled carpool rides" },
  { id: "disputes", model: "Dispute", description: "Ride dispute management" },
  { id: "saved_places", model: "SavedPlace", description: "Saved places for quick booking" },
  { id: "notification_prefs", model: "NotificationPref", description: "User notification preferences" },
  { id: "promotions", model: "Promotion", description: "Promo codes and discounts" },
  { id: "referrals", model: "Referral", description: "User referral codes and rewards" },
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
    { upsert: true },
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
    .collection("driver_profiles")
    .createIndex({ currentLocation: "2dsphere" }, { name: "driverLocation_2dsphere", background: true })
    .catch((err) => console.error("[indexes] driver_profiles.2dsphere:", err.message));

  await db
    .collection("rides")
    .createIndex(
      { status: 1, "pickup.coordinates": "2dsphere", poolSeats: 1 },
      { name: "rides_poolMatching_compound", background: true },
    )
    .catch((err) => console.error("[indexes] rides.poolMatching:", err.message));

  // New collection indexes
  await db
    .collection("refresh_tokens")
    .createIndex({ userId: 1 })
    .catch((err) => console.error("[indexes] refresh_tokens.userId:", err.message));
  await db
    .collection("refresh_tokens")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 604800 })
    .catch((err) => console.error("[indexes] refresh_tokens.expiresAt:", err.message));

  // refreshTokens (camelCase) — used by refreshTokenService.js
  await db
    .collection("refreshTokens")
    .createIndex({ userId: 1 })
    .catch((err) => console.error("[indexes] refreshTokens.userId:", err.message));
  await db
    .collection("refreshTokens")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 604800 })
    .catch((err) => console.error("[indexes] refreshTokens.expiresAt:", err.message));

  await db
    .collection("fcm_tokens")
    .createIndex({ userId: 1 })
    .catch((err) => console.error("[indexes] fcm_tokens.userId:", err.message));
  await db
    .collection("fcm_tokens")
    .createIndex({ token: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] fcm_tokens.token:", err.message));
  await db
    .collection("fcm_tokens")
    .createIndex({ createdAt: 1 })
    .catch((err) => console.error("[indexes] fcm_tokens.createdAt:", err.message));

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
    .createIndex({ role: 1 })
    .catch((err) => console.error("[indexes] users.role:", err.message));

  await db
    .collection("driver_profiles")
    .createIndex({ userId: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] driver_profiles.userId:", err.message));
  await db
    .collection("driver_profiles")
    .createIndex({ isOnline: 1, isAvailable: 1 })
    .catch((err) => console.error("[indexes] driver_profiles.isOnline+isAvailable:", err.message));

  await db
    .collection("rides")
    .createIndex({ passenger_id: 1, status: 1 })
    .catch((err) => console.error("[indexes] rides.passenger_id+status:", err.message));
  await db
    .collection("rides")
    .createIndex({ driver_id: 1, status: 1 })
    .catch((err) => console.error("[indexes] rides.driver_id+status:", err.message));

  // Heatmap query: rides grouped by status filtered by recency
  await db
    .collection("rides")
    .createIndex({ status: 1, updatedAt: 1 }, { background: true })
    .catch((err) => console.error("[indexes] rides.status+updatedAt:", err.message));

  await db
    .collection("refresh_tokens")
    .createIndex({ tokenHash: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] refresh_tokens.tokenHash:", err.message));

  await db
    .collection("refreshTokens")
    .createIndex({ tokenHash: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] refreshTokens.tokenHash:", err.message));

  await db
    .collection("email_password_reset_otps")
    .createIndex({ email: 1 })
    .catch((err) => console.error("[indexes] email_password_reset_otps.email:", err.message));
  await db
    .collection("email_password_reset_otps")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 300 })
    .catch((err) => console.error("[indexes] email_password_reset_otps.expiresAt TTL:", err.message));

  await db
    .collection("admin_audit_logs")
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
    .catch((err) => console.error("[indexes] admin_audit_logs.createdAt TTL:", err.message));

  await db
    .collection("messages")
    .createIndex({ rideId: 1, createdAt: 1 })
    .catch((err) => console.error("[indexes] messages.rideId+createdAt:", err.message));

  await db
    .collection("bookings")
    .createIndex({ rideId: 1 })
    .catch((err) => console.error("[indexes] bookings.rideId:", err.message));

  // Safety events indexes
  await db
    .collection("safety_events")
    .createIndex({ userId: 1, createdAt: -1 })
    .catch((err) => console.error("[indexes] safety_events.userId+createdAt:", err.message));
  await db
    .collection("safety_events")
    .createIndex({ status: 1 })
    .catch((err) => console.error("[indexes] safety_events.status:", err.message));

  // Favorite drivers indexes
  await db
    .collection("favorite_drivers")
    .createIndex({ userId: 1, driverId: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] favorite_drivers.userId+driverId:", err.message));

  // Carpools indexes
  await db
    .collection("carpools")
    .createIndex({ driverId: 1 })
    .catch((err) => console.error("[indexes] carpools.driverId:", err.message));
  await db
    .collection("carpools")
    .createIndex({ status: 1, "origin.coordinates": "2dsphere" })
    .catch((err) => console.error("[indexes] carpools.status+origin:", err.message));

  // Disputes indexes
  await db
    .collection("disputes")
    .createIndex({ userId: 1, createdAt: -1 })
    .catch((err) => console.error("[indexes] disputes.userId+createdAt:", err.message));
  await db
    .collection("disputes")
    .createIndex({ rideId: 1 })
    .catch((err) => console.error("[indexes] disputes.rideId:", err.message));
  await db
    .collection("disputes")
    .createIndex({ status: 1 })
    .catch((err) => console.error("[indexes] disputes.status:", err.message));

  // Driver bonuses indexes
  await db
    .collection("driver_bonuses")
    .createIndex({ driverId: 1, periodStart: -1 })
    .catch((err) => console.error("[indexes] driver_bonuses.driverId+periodStart:", err.message));

  // Saved places indexes
  await db
    .collection("saved_places")
    .createIndex({ userId: 1, createdAt: -1 })
    .catch((err) => console.error("[indexes] saved_places.userId+createdAt:", err.message));

  // Notification prefs indexes
  await db
    .collection("notification_prefs")
    .createIndex({ userId: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] notification_prefs.userId:", err.message));

  // Promotions indexes
  await db
    .collection("promotions")
    .createIndex({ code: 1 }, { unique: true })
    .catch((err) => console.error("[indexes] promotions.code:", err.message));
  await db
    .collection("promotions")
    .createIndex({ isActive: 1, expiresAt: 1 })
    .catch((err) => console.error("[indexes] promotions.isActive+expiresAt:", err.message));

  // Referrals indexes
  await db
    .collection("referrals")
    .createIndex({ code: 1 }, { unique: true, sparse: true })
    .catch((err) => console.error("[indexes] referrals.code:", err.message));
  await db
    .collection("referrals")
    .createIndex({ userId: 1 })
    .catch((err) => console.error("[indexes] referrals.userId:", err.message));
}
