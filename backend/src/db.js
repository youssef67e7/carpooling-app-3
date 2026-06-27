import { connectMongo, getDb, getMongoSetupHelp, isMongoConfigured, isMongoReady, resolveMongoDbName } from "./mongo/client.js";
import { ensureMongoIndexes, initMongoCloud } from "./mongo/schema.js";
import { ensureFixedAdminAccounts } from "./services/ensureFixedAdmins.js";
import { seedMockDrivers } from "./seed/seedMockDrivers.js";
import { seedVehicles } from "./seed/seedVehicles.js";
import { seedDemoPlatform } from "./seed/seedDemoPlatform.js";
import { migrateFcmTokens } from "./migrations/migrateFcmTokens.js";

let initPromise = null;
let seeded = false;

/** Idempotent MongoDB init (cached for Vercel serverless cold starts). */
export async function ensureDb() {
  if (isMongoReady()) {
    if (!seeded) {
      await runSeeds();
      seeded = true;
    }
    return true;
  }

  if (process.env.VERCEL && !isMongoConfigured()) {
    throw new Error("MongoDB is required on Vercel — set MONGODB_URI and MONGODB_DB_NAME");
  }

  if (!initPromise) {
    initPromise = (async () => {
      await connectMongo();
      await ensureMongoIndexes(getDb);
      console.log("MongoDB connected");
      return true;
    })().catch((err) => {
      initPromise = null;
      if (String(process.env.ALLOW_START_WITHOUT_MONGO || "").trim() === "1") {
        console.warn("[db] MongoDB unavailable — API starting without database:", err?.message || err);
        return false;
      }
      throw err;
    });
  }

  const connected = await initPromise;
  if (!connected) return false;

  if (!seeded) {
    await runSeeds();
    seeded = true;
  }

  return true;
}

async function runSeeds() {
  if (isMongoConfigured()) {
    await initMongoCloud(getDb, { dbName: resolveMongoDbName() });
  }
  await ensureFixedAdminAccounts();
  await seedVehicles();
  // One-time migration: move fcmToken from users -> fcmTokens collection
  await migrateFcmTokens().catch((err) => console.error("[migration] fcmToken migration error:", err?.message));
  if (!process.env.VERCEL) {
    await seedMockDrivers();
    await seedDemoPlatform();
  }
}

export { getMongoSetupHelp };
