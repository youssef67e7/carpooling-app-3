/**
 * Native MongoDB driver wrapper for the Vercel migration.
 *
 * Replaces the old custom ODM (odm.js) with a standard connection pool
 * using the official mongodb driver. No Express, Socket.io, or ODM imports.
 *
 * Connection is lazy — no network I/O until the first getDb() call.
 */

import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "weret";

const OPTIONS = {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
};

/** @type {MongoClient | null} */
let client = null;

/** @type {import("mongodb").Db | null} */
let db = null;

/**
 * Returns the database instance, connecting on first call.
 * @returns {Promise<import("mongodb").Db>}
 */
export async function getDb() {
  if (db) return db;

  if (!URI) {
    throw new Error(
      "MONGODB_URI is not set. Provide it in backend/.env or set MONGODB_FALLBACK_MEMORY=1 for local dev."
    );
  }

  client = new MongoClient(URI, OPTIONS);
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

/**
 * Closes the connection pool gracefully.
 * Safe to call multiple times — no-op when already closed.
 * @returns {Promise<void>}
 */
export async function closeDb() {
  if (client) {
    try {
      await client.close();
    } catch {
      // ignore close errors
    }
    client = null;
    db = null;
  }
}
