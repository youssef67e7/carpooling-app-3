import crypto from "crypto";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

import { newDocId } from "../mongo/odm.js";

const COLLECTIONS = ["rides", "driver_profiles", "users", "admin_accounts", "notifications"];

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  let totalMigrated = 0;

  for (const collName of COLLECTIONS) {
    const coll = db.collection(collName);
    const docsWithObjectId = await coll.find({ _id: { $type: "objectId" } }).toArray();

    for (const doc of docsWithObjectId) {
      const oldId = doc._id;
      const newId = newDocId();
      const { _id, ...rest } = doc;

      await coll.insertOne({ _id: newId, ...rest });
      await coll.deleteOne({ _id: oldId });
      totalMigrated++;
      console.log(`Migrated ${collName} ${oldId} → ${newId}`);
    }
  }

  await client.close();
  console.log(`\nDone. Migrated ${totalMigrated} documents.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
