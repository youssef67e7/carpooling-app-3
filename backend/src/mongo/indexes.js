import { getDb } from "./nativeClient.js";

/**
 * Creates all application indexes idempotently.
 * Does NOT throw — failures are logged and swallowed so index
 * creation never blocks server startup.
 */
export async function ensureIndexes() {
  try {
    const db = await getDb();

    await db.collection("users").createIndex({ phone: 1 }, { unique: true });
    await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });

    await db
      .collection("phone_login_otps")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    await db
      .collection("admin_audit_logs")
      .createIndex({ created_at: 1 }, { expireAfterSeconds: 2592000 });

    await db.collection("rides").createIndex({ passenger_id: 1, status: 1 });
    await db.collection("rides").createIndex({ driver_id: 1, status: 1 });
  } catch (err) {
    console.error("[indexes] Failed to ensure indexes:", err.message);
  }
}
