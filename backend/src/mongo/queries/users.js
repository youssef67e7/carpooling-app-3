import { getDb } from "../nativeClient.js";
import { ObjectId } from "mongodb";

const COLLECTION = "users";
const EXCLUDE_PASSWORD = { projection: { password_hash: 0 } };

/**
 * Queries a user by _id.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findById(userId) {
  const db = await getDb();
  return db.collection(COLLECTION).findOne({ _id: new ObjectId(userId) }, EXCLUDE_PASSWORD);
}

/**
 * Queries a user by phone number.
 * @param {string} phone
 * @returns {Promise<object|null>}
 */
export async function findByPhone(phone) {
  const db = await getDb();
  return db.collection(COLLECTION).findOne({ phone });
}

/**
 * Queries a user by Google sub.
 * @param {string} sub
 * @returns {Promise<object|null>}
 */
export async function findByGoogleSub(sub) {
  const db = await getDb();
  return db.collection(COLLECTION).findOne({ google_sub: sub });
}

/**
 * Inserts a new user document.
 * @param {object} userData
 * @returns {Promise<import("mongodb").InsertedId>}
 */
export async function create(userData) {
  const db = await getDb();
  const result = await db.collection(COLLECTION).insertOne(userData);
  return result.insertedId;
}

/**
 * Updates a user document with $set.
 * Returns the updated document (excluding password_hash), or null if not found.
 * @param {string} userId
 * @param {object} updateData
 * @returns {Promise<object|null>}
 */
export async function updateById(userId, updateData) {
  const db = await getDb();
  const result = await db
    .collection(COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: "after", projection: { password_hash: 0 } },
    );
  return result;
}
