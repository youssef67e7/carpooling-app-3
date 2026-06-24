import { getDb } from "../nativeClient.js";
import { ObjectId } from "mongodb";

const COLLECTION = "phone_login_otps";

/**
 * Inserts a new OTP record.
 * @param {string} phone
 * @param {string} codeHash
 * @param {Date} expiresAt
 * @returns {Promise<import("mongodb").InsertedId>}
 */
export async function createOtp(phone, codeHash, expiresAt) {
  const db = await getDb();
  const result = await db.collection(COLLECTION).insertOne({
    phone_number: phone,
    code: codeHash,
    expires_at: expiresAt,
    attempts: 0,
    created_at: new Date(),
  });
  return result.insertedId;
}

/**
 * Returns the most recent OTP for a phone number, or null.
 * @param {string} phone
 * @returns {Promise<object|null>}
 */
export async function findOtp(phone) {
  const db = await getDb();
  const cursor = db
    .collection(COLLECTION)
    .find({ phone_number: phone })
    .sort({ created_at: -1 })
    .limit(1);
  const docs = await cursor.toArray();
  return docs[0] ?? null;
}

/**
 * Increments the attempt counter on an OTP record.
 * @param {string} otpId
 * @returns {Promise<void>}
 */
export async function incrementAttempts(otpId) {
  const db = await getDb();
  await db
    .collection(COLLECTION)
    .updateOne({ _id: new ObjectId(otpId) }, { $inc: { attempts: 1 } });
}
