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
}
