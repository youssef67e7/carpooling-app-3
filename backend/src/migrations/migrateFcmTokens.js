import { getDb } from "../mongo/client.js";

export async function migrateFcmTokens() {
  const db = getDb();

  const usersWithToken = await db
    .collection("users")
    .find({ fcmToken: { $exists: true, $ne: null, $ne: "" } })
    .toArray();

  if (usersWithToken.length === 0) {
    console.log("[migration] No users with fcmToken to migrate");
    return;
  }

  console.log(`[migration] Migrating fcmToken for ${usersWithToken.length} users...`);

  const fcmDocs = usersWithToken.map((u) => ({
    userId: u._id,
    token: u.fcmToken,
    platform: "android",
    createdAt: new Date(),
  }));

  await db.collection("fcmTokens").insertMany(fcmDocs, { ordered: false }).catch(() => {});

  await db
    .collection("users")
    .updateMany({ fcmToken: { $exists: true } }, { $unset: { fcmToken: "" } });

  console.log("[migration] fcmToken migration complete");
}
