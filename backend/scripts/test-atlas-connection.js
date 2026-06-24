/**
 * Test MongoDB Atlas connectivity using backend/.env (no memory fallback).
 * Run: npm run mongo:test-atlas --prefix backend
 */
import "../src/loadEnv.js";
import { connectMongo, closeMongo, getMongoConnectionInfo } from "../src/mongo/client.js";
import { countMongoCollections } from "../src/mongo/schema.js";
import { getDb } from "../src/mongo/client.js";

process.env.MONGODB_FALLBACK_MEMORY = "0";
process.env.MONGODB_USE_MEMORY = "0";

async function main() {
  console.log("\nTesting MongoDB Atlas connection...\n");
  try {
    await connectMongo();
    const info = getMongoConnectionInfo();
    const counts = await countMongoCollections(getDb);
    console.log("✓ Connected:", info.mode, "| db:", info.dbName);
    console.log("  persistsInAtlasUi:", info.persistsInAtlasUi);
    console.log("  users collection count:", counts.users ?? 0);
    if (info.mode !== "atlas") {
      console.error("\n✗ Not connected to Atlas — app/web changes will NOT appear in Atlas UI.\n");
      process.exit(1);
    }
    console.log("\n✓ Atlas OK — add/delete from app and web will sync to Atlas.\n");
  } catch (e) {
    console.error("\n✗ Atlas connection failed:", e.message);
    console.error(`
Fix checklist:
  1. MongoDB Atlas → Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)
  2. Disable Cloudflare WARP / VPN (causes SSL alert 80 on Windows)
  3. Verify MONGODB_URI and password in backend/.env
  4. Restart backend: npm run backend
`);
    process.exit(1);
  } finally {
    await closeMongo();
  }
}

main();
