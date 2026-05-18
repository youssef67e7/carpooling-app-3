import mongoose from "mongoose";
import { ensureFixedAdminAccounts } from "./services/ensureFixedAdmins.js";
import { seedMockDrivers } from "./seed/seedMockDrivers.js";
import { seedVehicles } from "./seed/seedVehicles.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ridehail";

let connectPromise = null;
let seeded = false;

function safeMongoUriForLogs(uri) {
  return String(uri).replace(/:[^:@/]+@/, ":****@");
}

/** Idempotent Mongo connect (cached for Vercel serverless cold starts). */
export async function ensureDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectPromise) {
    connectPromise = (async () => {
      console.log(`Connecting MongoDB → ${safeMongoUriForLogs(MONGODB_URI)}`);
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
      console.log("MongoDB connected");
      return mongoose.connection;
    })().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }

  await connectPromise;

  if (!seeded) {
    await ensureFixedAdminAccounts();
    await seedVehicles();
    if (!process.env.VERCEL) {
      await seedMockDrivers();
    }
    seeded = true;
  }

  return mongoose.connection;
}
