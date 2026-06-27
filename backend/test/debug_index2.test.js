import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { connectMongo, closeMongo, getDb, getCollection } from "../src/mongo/client.js";
import { ensureMongoIndexes } from "../src/mongo/schema.js";
import { Ride } from "../src/models/Ride.js";

describe("Debug Index v2", () => {
  before(async () => {
    process.env.MONGODB_URI = "memory";
    process.env.JWT_SECRET = "test";
    process.env.EMAIL_OTP_SECRET = "test";
    process.env.CLOUDINARY_CLOUD_NAME = "test";
    process.env.CLOUDINARY_API_KEY = "test";
    process.env.CLOUDINARY_API_SECRET = "test";
    process.env.ADMIN_PASSWORD_YOUSSEF = "test";
    process.env.ADMIN_PASSWORD_YOUSSEF1 = "test1";
    process.env.VERCEL = "1";
    await connectMongo();
    const db = getDb();
    await ensureMongoIndexes(() => db);
  });

  after(async () => {
    await closeMongo();
  });

  it("check actual stored fields", async () => {
    const userId = "debug2-user-1";
    const r1 = await Ride.create({
      passengerId: userId,
      status: "pending",
      pickupLocation: { lat: 1, lng: 2 },
      destinationLocation: { lat: 3, lng: 4 },
    });
    console.log("Ride created, id:", r1._id);

    // Read raw doc from MongoDB
    const raw = await getCollection("rides").findOne({ _id: r1._id });
    console.log("Raw doc keys:", Object.keys(raw));
    console.log("passenger_id:", raw.passenger_id);
    console.log("passengerId:", raw.passengerId);
    console.log("status:", raw.status);

    // Now try creating a second ride
    try {
      const r2 = await Ride.create({
        passengerId: userId,
        status: "pending",
        pickupLocation: { lat: 5, lng: 6 },
        destinationLocation: { lat: 7, lng: 8 },
      });
      console.log("SECOND RIDE CREATED:", r2._id, "- INDEX NOT WORKING");
    } catch (e) {
      console.log("Second ride error - name:", e.name, "code:", e.code, "msg:", e.message?.substring(0, 120));
    }
  });

  it("manual insert with unique index", async () => {
    const userId = "debug2-user-2";
    const db = getDb();
    await db.collection("rides").insertOne({ _id: "manual-1", passenger_id: userId, status: "pending" });
    console.log("First manual insert OK");
    try {
      await db.collection("rides").insertOne({ _id: "manual-2", passenger_id: userId, status: "pending" });
      console.log("Second manual insert SUCCEEDED - UNEXPECTED");
    } catch (e) {
      console.log("Second manual insert error:", e.name, "code:", e.code, "msg:", e.message?.substring(0, 120));
    }
  });
});
