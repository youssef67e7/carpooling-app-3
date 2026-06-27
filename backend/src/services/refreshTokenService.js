import crypto from "crypto";
import { getDb } from "../mongo/client.js";
import { signUserToken } from "../utils/signUserToken.js";

export function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function storeRefreshToken(userId, rawToken) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);

  await db.collection("refreshTokens").insertOne({
    userId,
    tokenHash,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return rawToken;
}

export async function rotateRefreshToken(userId, oldRawToken) {
  const db = getDb();
  const oldHash = hashToken(oldRawToken);

  const deleted = await db.collection("refreshTokens").findOneAndDelete({
    userId,
    tokenHash: oldHash,
  });

  if (!deleted) {
    await db.collection("refreshTokens").deleteMany({ userId });

    const error = new Error("Token reuse detected — all sessions revoked");
    error.code = "TOKEN_REVOKED";
    error.statusCode = 401;
    throw error;
  }

  const user = await db.collection("users").findOne({ _id: userId }, { projection: { role: 1, active_role: 1 } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 401;
    throw error;
  }

  const accessToken = signUserToken(user);
  const newRawToken = generateRefreshToken();
  await storeRefreshToken(userId, newRawToken);

  return { accessToken, refreshToken: newRawToken };
}

export async function revokeAllRefreshTokens(userId) {
  const db = getDb();
  const result = await db.collection("refreshTokens").deleteMany({ userId });
  return result.deletedCount;
}

export async function revokeRefreshToken(rawToken) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const result = await db.collection("refreshTokens").deleteOne({ tokenHash });
  return result.deletedCount > 0;
}
