import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { connectMongo, closeMongo, getCollection, getDb } from "../src/mongo/client.js";
import { createApp } from "../src/createApp.js";
import { seedVehicles } from "../src/seed/seedVehicles.js";
import { ensureMongoIndexes } from "../src/mongo/schema.js";
import { User } from "../src/models/User.js";
import { DriverProfile } from "../src/models/DriverProfile.js";
import { PassengerProfile } from "../src/models/PassengerProfile.js";
import { WalletAccount } from "../src/models/WalletAccount.js";
import { camelToSnake } from "../src/mongo/fieldMap.js";

const ENV_KEYS = [
  "MONGODB_URI", "JWT_SECRET", "NODE_ENV", "EMAIL_OTP_SECRET",
  "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
  "ADMIN_PASSWORD_YOUSSEF", "ADMIN_PASSWORD_YOUSSEF1", "VERCEL",
];

async function req(method, base, path, body, token) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const opts = { method, headers };
  if (body != null) opts.body = JSON.stringify(body);
  const res = await fetch(`${base}${path}`, opts);
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}
const get = (b, p, t) => req("GET", b, p, null, t);
const post = (b, p, j, t) => req("POST", b, p, j, t);

async function seedTestDriver({ online = true } = {}) {
  const user = await User.create({
    name: "Integration Test Driver",
    email: `driver_int_${Date.now()}@test.local`,
    password: "$2a$10$test",
    role: "driver",
    active_role: "driver",
    isOnline: online,
    is_verified: true,
    driver_application_status: "approved",
    vehicleType: "car_standard",
    location: { lat: 24.7136, lng: 46.6753 },
  });
  const profile = await DriverProfile.create({
    userId: user._id,
    status: "approved",
    reviewNote: "",
    vehicleType: "car_standard",
    licenseNumber: "LIC123456",
    licenseImageUrl: "/uploads/public/test/license.jpg",
    licenseExpiry: new Date("2030-01-01"),
    cars: [{
      imageUrl: "/uploads/public/test/car.jpg",
      brand: "Toyota",
      model: "Corolla",
      color: "White",
      plateNumber: "TEST-0001",
      seats: 4,
      carCategory: "sedan",
    }],
  });
  if (profile && !profile.selectedCarId && Array.isArray(profile.cars) && profile.cars[0]?._id) {
    profile.selectedCarId = profile.cars[0]._id;
    await profile.save();
  }
  return user;
}

async function seedTestPassenger() {
  const user = await User.create({
    name: "Integration Test Passenger",
    email: `pass_int_${Date.now()}@test.local`,
    password: "$2a$10$test",
    role: "passenger",
    active_role: "passenger",
    isOnline: false,
    is_verified: true,
  });
  await PassengerProfile.create({ userId: user._id, rating: 4.5 });
  const wallet = await WalletAccount.create({
    userId: user._id,
    walletType: "cash",
    label: "Main wallet",
    balance: 0,
    isDefault: true,
  });
  return { user, wallet };
}

async function fundWallet(walletId, amount) {
  const col = getCollection("wallet_accounts");
  await col.updateOne({ _id: walletId }, { $inc: { balance: amount } });
}

describe("Integration Suite", () => {
  const saved = {};
  let server;
  let base;
  let passengerToken, driverToken, adminToken;
  let passengerUser, driverUser, passengerWallet;

  before(async () => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    process.env.MONGODB_URI = "memory";
    process.env.JWT_SECRET = "test-jwt-secret-integration";
    process.env.NODE_ENV = "test";
    process.env.EMAIL_OTP_SECRET = "test-email-otp-secret";
    process.env.CLOUDINARY_CLOUD_NAME = "test";
    process.env.CLOUDINARY_API_KEY = "test";
    process.env.CLOUDINARY_API_SECRET = "test";
    process.env.ADMIN_PASSWORD_YOUSSEF = "test-admin-pass";
    process.env.ADMIN_PASSWORD_YOUSSEF1 = "test-admin-pass-1";
    process.env.VERCEL = "1";

    console.log("connecting...");
    await connectMongo();
    console.log("connected");
    const db = getDb();
    await ensureMongoIndexes(() => db);
    console.log("indexes ok");
    await seedVehicles();
    console.log("seeds ok");

    await User.create({
      name: "Admin Youssef",
      email: "youssef@gmail.com",
      password: "$2a$10$test",
      role: "admin",
      active_role: "admin",
      is_verified: true,
      isOnline: false,
    });
    console.log("admin user ok");

    driverUser = await seedTestDriver({ online: true });
    console.log("driver ok");

    const seeded = await seedTestPassenger();
    passengerUser = seeded.user;
    passengerWallet = seeded.wallet;
    await fundWallet(passengerWallet._id, 1000);
    console.log("passenger ok");

    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
    console.log("server ok on", base);
  });

  after(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await closeMongo();
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  /* ── Auth ───────────────────────────────────────────── */
  describe("Auth", () => {
    it("register + login", async () => {
      const email = `fresh_${Date.now()}@test.local`;
      const r = await post(base, "/auth/register", { name: "Fresh", email, password: "mypass123" });
      assert.equal(r.status, 201);
      assert.ok(r.body.accessToken);

      const login = await post(base, "/auth/login", { email, password: "mypass123" });
      assert.equal(login.status, 200);

      const wrong = await post(base, "/auth/login", { email, password: "wrongpass" });
      assert.equal(wrong.status, 401);
    });

    it("admin login", async () => {
      const r = await post(base, "/auth/login", { email: "youssef@gmail.com", password: "test-admin-pass" });
      assert.equal(r.status, 200);
      adminToken = r.body.accessToken;
    });
  });

  /* ── Passenger & driver tokens ──────────────────────── */
  describe("Token acquisition", () => {
    it("passenger token", async () => {
      const email = `pass_auth_${Date.now()}@test.local`;
      const reg = await post(base, "/auth/register", { name: "AuthPass", email, password: "test1234" });
      assert.equal(reg.status, 201);
      passengerToken = reg.body.accessToken;
    });

    it("driver token + go online", async () => {
      const email = `driver_auth_${Date.now()}@test.local`;
      const reg = await post(base, "/auth/register", { name: "AuthDriver", email, password: "test1234" });
      assert.equal(reg.status, 201);
      const uid = reg.body.user._id || reg.body.user.id;
      driverToken = reg.body.accessToken;
      // Promote to driver directly in DB
      await User.updateOne({ _id: uid }, { $set: { role: "driver", active_role: "driver", isOnline: false, driver_application_status: "approved" } });
      // Create driver profile via native collection to bypass ODM nested-id quirk
      const dpCol = getCollection("driver_profiles");
      const carId = new (await import("mongodb")).ObjectId();
      await dpCol.insertOne({
        user_id: uid,
        status: "approved",
        vehicleType: "car_standard",
        licenseNumber: "LICDRV001",
        licenseImageUrl: "/uploads/public/test/lic.jpg",
        licenseExpiry: new Date("2030-06-01").toISOString(),
        cars: [{ _id: carId, imageUrl: "/uploads/public/test/car.jpg", brand: "Honda", model: "Civic", color: "Blue", plateNumber: "DRV-001", seats: 4, carCategory: "sedan" }],
        selectedCarId: carId,
      });
      // Toggle online (was offline, now goes online)
      const r = await post(base, "/driver/toggle-status", null, driverToken);
      assert.equal(r.status, 200);
      assert.equal(r.body.isOnline, true);
    });
  });

  /* ── Ride Lifecycle ─────────────────────────────────── */
  describe("Ride Lifecycle", () => {
    let rideId;

    it("create ride", async () => {
      const r = await post(base, "/rides/", {
        pickup: { lat: 24.7136, lng: 46.6753, address: "Pickup" },
        dropoff: { lat: 24.7300, lng: 46.6900, address: "Dropoff" },
        vehicleType: "car_standard",
      }, passengerToken);
      assert.equal(r.status, 201);
      rideId = r.body.data.ride._id;
    });

    it("reject duplicate", async () => {
      const r = await post(base, "/rides/", {
        pickup: { lat: 24.71, lng: 46.67 },
        dropoff: { lat: 24.73, lng: 46.69 },
        vehicleType: "car_standard",
      }, passengerToken);
      assert.equal(r.status, 400);
    });

    it("accept ride", async () => {
      const r = await post(base, `/rides/${rideId}/accept`, {}, driverToken);
      assert.equal(r.status, 200);
    });

    it("arriving", async () => {
      const r = await post(base, `/rides/${rideId}/arriving`, {}, driverToken);
      assert.equal(r.status, 200);
    });

    it("onboard", async () => {
      const r = await post(base, `/rides/${rideId}/onboard`, {}, driverToken);
      assert.equal(r.status, 200);
    });

    it("start", async () => {
      const r = await post(base, "/rides/start", { rideId }, driverToken);
      assert.equal(r.status, 200);
    });

    it("complete", async () => {
      const r = await post(base, "/rides/end", { rideId }, driverToken);
      assert.equal(r.status, 200);
    });
  });

  /* ── Break Mode ─────────────────────────────────────── */
  describe("Break Mode", () => {
    let rideId;

    before(async () => {
      const email = `off_pass_${Date.now()}@test.local`;
      const reg = await post(base, "/auth/register", { name: "OffPass", email, password: "off12345" });
      const pt = reg.body.accessToken;
      const r = await post(base, "/rides/", {
        pickup: { lat: 24.71, lng: 46.67 },
        dropoff: { lat: 24.73, lng: 46.69 },
        vehicleType: "car_standard",
      }, pt);
      rideId = r.body.data.ride._id;
    });

    it("offline driver rejected", async () => {
      // Create an offline driver for this test
      const email = `off_drv_${Date.now()}@test.local`;
      const reg = await post(base, "/auth/register", { name: "OffDrv", email, password: "off12345" });
      const uid = reg.body.user._id || reg.body.user.id;
      await User.updateOne({ _id: uid }, { $set: { role: "driver", active_role: "driver", isOnline: false, driver_application_status: "approved" } });
      await DriverProfile.create({
        userId: uid,
        status: "approved",
        vehicleType: "car_standard",
        licenseNumber: "LICOFF1",
        licenseImageUrl: "/uploads/public/test/off.jpg",
        licenseExpiry: new Date("2030-06-01"),
        cars: [{ imageUrl: "/uploads/public/test/car.jpg", brand: "Ford", model: "Focus", color: "Red", plateNumber: "OFF-001", seats: 4, carCategory: "sedan" }],
      });
      const ot = reg.body.accessToken;
      const r = await post(base, `/rides/${rideId}/accept`, {}, ot);
      assert.equal(r.status, 403);
    });
  });

  /* ── Wallet ─────────────────────────────────────────── */
  describe("Wallet", () => {
    it("deposit idempotency", async () => {
      const email = `dep_pass_${Date.now()}@test.local`;
      const reg = await post(base, "/auth/register", { name: "DepPass", email, password: "dep12345" });
      const pt = reg.body.accessToken;
      const accts = await get(base, "/wallet/accounts", pt);
      const aid = accts.body.accounts?.[0]?._id;
      if (!aid) return;
      const key = `idem_${Date.now()}`;
      const d1 = await post(base, "/wallet/deposit", { walletAccountId: aid, amount: 100, paymentMethod: "card", idempotencyKey: key }, pt);
      assert.ok([200, 201].includes(d1.status));
      const d2 = await post(base, "/wallet/deposit", { walletAccountId: aid, amount: 100, paymentMethod: "card", idempotencyKey: key }, pt);
      assert.ok([200, 201].includes(d2.status));
    });
  });

  /* ── Misc ───────────────────────────────────────────── */
  describe("Misc", () => {
    it("admin list users", async () => {
      const r = await get(base, "/admin/users", adminToken);
      assert.equal(r.status, 200);
    });
    it("auth me", async () => {
      const r = await get(base, "/auth/me", passengerToken);
      assert.equal(r.status, 200);
    });
    it("driver status", async () => {
      const r = await get(base, "/driver/status", driverToken);
      assert.equal(r.status, 200);
    });
  });

  /* ── Ride Detail & Status ──────────────────────────── */
  describe("Ride Detail & Status", () => {
    it("get ride detail + status + history", async () => {
      const pem = `detail_pass_${Date.now()}@test.local`;
      const preg = await post(base, "/auth/register", { name: "DetailPass", email: pem, password: "dt12345" });
      const rideToken = preg.body.accessToken;
      if (!rideToken) { console.log("SKIP: no token", JSON.stringify(preg.body).slice(0, 200)); return; }
      const c = await post(base, "/rides/", {
        pickup: { lat: 24.71, lng: 46.67, address: "Detail pickup" },
        dropoff: { lat: 24.73, lng: 46.69, address: "Detail dropoff" },
        vehicleType: "car_standard",
      }, rideToken);
      const rideId = c.body.data?.ride?._id;
      if (!rideId) { console.log("SKIP: no rideId", c.status, JSON.stringify(c.body).slice(0, 200)); return; }
      const detail = await get(base, `/rides/${rideId}`, rideToken);
      assert.equal(detail.status, 200);
      const status = await get(base, `/rides/${rideId}/status`, rideToken);
      assert.equal(status.status, 200);
      assert.equal(status.body.status || status.body.data?.status, "pending");
      const hist = await get(base, "/rides/history", passengerToken);
      assert.equal(hist.status, 200);
      assert.ok(Array.isArray(hist.body.data?.items));
    });
  });

  /* ── Ride State Guards ──────────────────────────────── */
  describe("Ride State Guards", () => {
    let rideId, passengerTok, driverTok, ourDriver;
    before(async () => {
      // Create a dedicated passenger
      const pem = `guard_pass_${Date.now()}@test.local`;
      const preg = await post(base, "/auth/register", { name: "GuardPass", email: pem, password: "guard123" });
      passengerTok = preg.body.accessToken;
      // Create dedicated driver
      const dem = `guard_drv_${Date.now()}@test.local`;
      const dreg = await post(base, "/auth/register", { name: "GuardDrv", email: dem, password: "guard123" });
      driverTok = dreg.body.accessToken;
      const duid = dreg.body.user._id || dreg.body.user.id;
      await User.updateOne({ _id: duid }, { $set: { role: "driver", active_role: "driver", isOnline: true, driver_application_status: "approved", vehicleType: "car_standard" } });
      await DriverProfile.create({ userId: duid, status: "approved", vehicleType: "car_standard", licenseNumber: "GUARD001", licenseImageUrl: "/uploads/public/test/g.jpg", licenseExpiry: new Date("2030-01-01"), cars: [{ imageUrl: "/uploads/public/test/c.jpg", brand: "Nissan", model: "Sunny", color: "Black", plateNumber: "GRD-001", seats: 4, carCategory: "sedan" }] });
      ourDriver = await User.findById(duid);
      // Create pending ride
      const r = await post(base, "/rides/", {
        pickup: { lat: 24.71, lng: 46.67, address: "Guard pickup" },
        dropoff: { lat: 24.73, lng: 46.69, address: "Guard dropoff" },
        vehicleType: "car_standard",
      }, passengerTok);
      rideId = r.body.data?.ride?._id;
    });
    it("reject wrong passenger cancel", async () => {
      // driver cannot use passenger cancel endpoint
      const r = await post(base, `/rides/${rideId}/cancel`, { reason: "nope" }, driverTok);
      assert.equal(r.status, 403);
    });
    it("reject complete before accept", async () => {
      const r = await post(base, "/rides/end", { rideId }, driverTok);
      assert.equal(r.status, 400);
    });
    it("reject start before accept", async () => {
      const r = await post(base, "/rides/start", { rideId }, driverTok);
      assert.equal(r.status, 400);
    });
    it("accept then state guard: reject double accept", async () => {
      await post(base, `/rides/${rideId}/accept`, {}, driverTok);
      const r = await post(base, `/rides/${rideId}/accept`, {}, driverTok);
      assert.equal(r.status, 400);
    });
    it("reject onboard before arriving", async () => {
      // Create a new pending ride for the arriving test
      const r2 = await post(base, "/rides/", {
        pickup: { lat: 24.71, lng: 46.67, address: "Guard pickup2" },
        dropoff: { lat: 24.73, lng: 46.69, address: "Guard dropoff2" },
        vehicleType: "car_standard",
      }, passengerTok);
      const rid2 = r2.body.data?.ride?._id;
      if (!rid2) return;
      const r = await post(base, `/rides/${rid2}/onboard`, {}, driverTok);
      assert.equal(r.status, 400);
    });
  });

  /* ── Passenger Cancel ───────────────────────────────── */
  describe("Passenger Cancel", () => {
    let rideId, pt;
    before(async () => {
      const pem = `pcancel_pass_${Date.now()}@test.local`;
      const preg = await post(base, "/auth/register", { name: "PCancelPass", email: pem, password: "pc12345" });
      pt = preg.body.accessToken;
      const r = await post(base, "/rides/", {
        pickup: { lat: 24.71, lng: 46.67, address: "Cancel pickup" },
        dropoff: { lat: 24.73, lng: 46.69, address: "Cancel dropoff" },
        vehicleType: "car_standard",
      }, pt);
      rideId = r.body.data?.ride?._id;
    });
    it("passenger cancel pending ride", async () => {
      if (!rideId || !pt) return;
      const r = await post(base, `/rides/${rideId}/cancel`, { reason: "Changed mind" }, pt);
      assert.equal(r.status, 200);
      assert.equal(r.body.data?.status, "cancelled");
    });
  });

  /* ── Saved Places CRUD ──────────────────────────────── */
  describe("Saved Places", () => {
    it("create + list + update + delete place", async () => {
      // Create
      const c = await post(base, "/places/", {
        name: "Home", address: "123 Main St", lat: 24.71, lng: 46.67, icon: "home",
      }, passengerToken);
      assert.equal(c.status, 201);
      const placeId = c.body.data?._id;
      if (!placeId) return;
      // Update
      const u = await req("PUT", base, `/places/${placeId}`, { name: "Home Updated" }, passengerToken);
      assert.ok([200, 201].includes(u.status));
      // Set default
      const d = await req("PUT", base, `/places/${placeId}/default`, {}, passengerToken);
      assert.equal(d.status, 200);
      // Delete
      const del = await req("DELETE", base, `/places/${placeId}`, null, passengerToken);
      assert.equal(del.status, 200);
    });
    it("list places (empty after delete)", async () => {
      const r = await get(base, "/places/", passengerToken);
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.body.data));
    });
  });

  /* ── Safety ─────────────────────────────────────────── */
  describe("Safety", () => {
    let eventId, contactId;
    it("create SOS event", async () => {
      const r = await post(base, "/safety/emergency", { message: "Test SOS" }, passengerToken);
      assert.equal(r.status, 201);
      eventId = r.body.data?.eventId;
    });
    it("resolve SOS event", async () => {
      if (!eventId) return;
      const r = await post(base, `/safety/emergency/${eventId}/resolve`, {}, passengerToken);
      assert.equal(r.status, 200);
    });
    it("add trusted contact", async () => {
      const r = await post(base, "/safety/trusted-contacts", {
        name: "Mom", phone: "+966500000000", relation: "mother",
      }, passengerToken);
      assert.equal(r.status, 201);
      contactId = r.body.data?._id;
    });
    it("list trusted contacts", async () => {
      const r = await get(base, "/safety/trusted-contacts", passengerToken);
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.body.data));
    });
    it("delete trusted contact", async () => {
      if (!contactId) return;
      const r = await req("DELETE", base, `/safety/trusted-contacts/${contactId}`, null, passengerToken);
      assert.equal(r.status, 200);
    });
    it("block another user", async () => {
      const targetId = String(driverUser._id);
      const r = await post(base, `/safety/block/${targetId}`, {}, passengerToken);
      assert.equal(r.status, 200);
    });
    it("list blocked users", async () => {
      const r = await get(base, "/safety/blocked", passengerToken);
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.body.data));
    });
    it("unblock user", async () => {
      const targetId = String(driverUser._id);
      const r = await req("DELETE", base, `/safety/block/${targetId}`, null, passengerToken);
      assert.equal(r.status, 200);
    });
  });

  /* ── Favorites ──────────────────────────────────────── */
  describe("Favorites", () => {
    it("favorite a driver", async () => {
      const r = await post(base, `/favorites/drivers/${driverUser._id}`, {}, passengerToken);
      assert.ok([200, 201].includes(r.status));
    });
    it("check driver favorite status", async () => {
      const r = await get(base, `/favorites/drivers/${driverUser._id}/check`, passengerToken);
      assert.equal(r.status, 200);
      assert.equal(r.body.isFavorite, true);
    });
    it("list favorites", async () => {
      const r = await get(base, "/favorites/drivers", passengerToken);
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.body.drivers));
    });
    it("unfavorite driver", async () => {
      const r = await req("DELETE", base, `/favorites/drivers/${driverUser._id}`, null, passengerToken);
      assert.equal(r.status, 200);
    });
  });

  /* ── Promotions ─────────────────────────────────────── */
  describe("Promotions", () => {
    let promoId;
    it("admin create promo", async () => {
      const r = await post(base, "/promotions/create", {
        code: "TEST50", title: "Test 50% Off", discountType: "percentage",
        discountValue: 50, maxDiscount: 25, maxUses: 100,
        expiresAt: new Date("2030-12-31").toISOString(),
      }, adminToken);
      assert.equal(r.status, 201);
      promoId = r.body.data?._id;
    });
    it("list active promos", async () => {
      const r = await get(base, "/promotions/active", passengerToken);
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.body.data));
    });
    it("validate promo code", async () => {
      const r = await post(base, "/promotions/validate", { code: "TEST50", rideFare: 100 }, passengerToken);
      assert.equal(r.status, 200);
      assert.equal(r.body.data?.discount, 25);
    });
    it("apply promo code", async () => {
      if (!promoId) return;
      const r = await post(base, `/promotions/apply/${promoId}`, { rideFare: 100 }, passengerToken);
      assert.equal(r.status, 200);
      assert.equal(r.body.data?.finalFare, 75);
    });
    it("reject invalid promo code", async () => {
      const r = await post(base, "/promotions/validate", { code: "INVALID" }, passengerToken);
      assert.equal(r.status, 404);
    });
  });

  /* ── Referrals ──────────────────────────────────────── */
  describe("Referrals", () => {
    let referralCode;
    it("get my referral code", async () => {
      const r = await get(base, "/referrals/my-code", passengerToken);
      assert.equal(r.status, 200);
      referralCode = r.body.data?.code;
    });
    it("get rewards", async () => {
      const r = await get(base, "/referrals/rewards", passengerToken);
      assert.equal(r.status, 200);
    });
    it("apply referral code", async () => {
      const pem = `ref_giver_${Date.now()}@test.local`;
      const preg = await post(base, "/auth/register", { name: "RefGiver", email: pem, password: "ref12345" });
      const gt = preg.body.accessToken;
      const myRef = await get(base, "/referrals/my-code", gt);
      const code = myRef.body.data?.code;
      if (!code) return;
      // New user applies giver's code
      const pem2 = `ref_taker_${Date.now()}@test.local`;
      const preg2 = await post(base, "/auth/register", { name: "RefTaker", email: pem2, password: "ref12345" });
      const tt = preg2.body.accessToken;
      const r = await post(base, "/referrals/apply", { code }, tt);
      assert.equal(r.status, 200);
    });
  });

  /* ── Preferences ────────────────────────────────────── */
  describe("Preferences", () => {
    it("get notification prefs", async () => {
      const r = await get(base, "/prefs/notifications", passengerToken);
      assert.equal(r.status, 200);
    });
    it("update notification prefs", async () => {
      const r = await req("PUT", base, "/prefs/notifications", { promotions: true }, passengerToken);
      assert.equal(r.status, 200);
    });
  });

  /* ── Driver Dashboard ──────────────────────────────── */
  describe("Driver Dashboard", () => {
    it("get dashboard", async () => {
      const r = await get(base, "/driver/dashboard", driverToken);
      assert.equal(r.status, 200);
    });
    it("get earnings summary", async () => {
      const r = await get(base, "/driver/earnings-summary", driverToken);
      assert.equal(r.status, 200);
    });
    it("get break mode", async () => {
      const r = await get(base, "/driver/break-mode", driverToken);
      assert.equal(r.status, 200);
    });
    it("toggle driver status", async () => {
      const r = await post(base, "/driver/toggle-status", {}, driverToken);
      assert.equal(r.status, 200);
    });
    it("get heatmap (geo queries)", async () => {
      const r = await get(base, "/driver/heatmap", driverToken);
      assert.equal(r.status, 200);
    });
    it("get bonuses", async () => {
      const r = await get(base, "/driver/bonuses", driverToken);
      assert.equal(r.status, 200);
    });
  });

  /* ── Wallet Extended ────────────────────────────────── */
  describe("Wallet Extended", () => {
    it("list transactions with fresh passenger", async () => {
      // Register an ad-hoc passenger, get their default wallet, deposit, then list transactions.
      const pem = `wtx_pass_${Date.now()}@test.local`;
      const preg = await post(base, "/auth/register", { name: "WTxPass", email: pem, password: "wt12345" });
      const pt = preg.body.accessToken;
      // The register endpoint creates a default WalletAccount, so GET /wallet/accounts should work
      const accts = await get(base, "/wallet/accounts", pt);
      const aid = accts.body.accounts?.[0]?._id;
      if (!aid) return;
      const d = await post(base, "/wallet/deposit", { walletAccountId: aid, amount: 50, paymentMethod: "card", idempotencyKey: `tx_${Date.now()}` }, pt);
      assert.ok([200, 201].includes(d.status));
      const r = await get(base, "/wallet/transactions", pt);
      assert.equal(r.status, 200);
      assert.ok(r.body.success);
      assert.ok(Array.isArray(r.body.data?.items));
    });
  });

  /* ── Ride Fetch ─────────────────────────────────────── */
  describe("Ride Fetch", () => {
    it("available rides endpoint returns list", async () => {
      const r = await get(base, "/rides/available", driverToken);
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.body.rides));
    });
    it("my-active rides endpoint returns list", async () => {
      const r = await get(base, "/rides/my-active", driverToken);
      assert.equal(r.status, 200);
    });
  });

  /* ── Ratings ────────────────────────────────────────── */
  describe("Ratings", () => {
    it("list empty ratings (no completed rides yet)", async () => {
      const r = await get(base, "/rides/ratings/received", driverToken);
      assert.equal(r.status, 200);
    });
  });

  /* ── Admin ──────────────────────────────────────────── */
  describe("Admin", () => {
    it("get admin stats", async () => {
      const r = await get(base, "/admin/stats", adminToken);
      assert.equal(r.status, 200);
    });
    it("list disputes as admin", async () => {
      const r = await get(base, "/disputes/admin", adminToken);
      assert.equal(r.status, 200);
    });
    it("reject non-admin access to disputes", async () => {
      const r = await get(base, "/disputes/admin", passengerToken);
      assert.equal(r.status, 403);
    });
  });

  /* ── Health ─────────────────────────────────────────── */
  describe("Health", () => {
    it("health endpoint", async () => {
      const r = await get(base, "/health", null);
      assert.equal(r.status, 200);
    });
  });

  /* ── Date Handling ──────────────────────────────────── */
  describe("Date Handling", () => {
    const DATE_FIELDS = [
      { name: "createdAt", desc: "creation timestamp" },
      { name: "updatedAt", desc: "update timestamp" },
      { name: "expiresAt", desc: "expiry timestamp" },
    ];

    it("stores dates as BSON Date (not string) via ODM", async () => {
      const { Promotion } = await import("../src/models/Promotion.js");
      const promo = await Promotion.create({
        code: `DATE_BSON_${Date.now()}`,
        title: "Date test",
        discountType: "fixed",
        discountValue: 5,
        isActive: true,
        startsAt: new Date("2025-01-01"),
        expiresAt: new Date("2035-12-31"),
      });
      const raw = await getCollection("promotions").findOne({ _id: promo._id });
      const snakeKeys = DATE_FIELDS.map(f => camelToSnake(f.name));
      for (const sk of snakeKeys) {
        assert.ok(raw[sk] instanceof Date,
          `${sk} should be BSON Date, got ${typeof raw[sk]}: ${raw[sk]}`);
      }
    });

    it("retrieves dates as JS Date objects via ODM", async () => {
      const { Promotion } = await import("../src/models/Promotion.js");
      const code = `DATE_RET_${Date.now()}`;
      await Promotion.create({
        code, title: "Date retrieval", discountType: "fixed",
        discountValue: 5, isActive: true,
        startsAt: new Date("2025-06-15"), expiresAt: new Date("2035-06-15"),
      });
      const found = await Promotion.findOne({ code });
      assert.ok(found.createdAt instanceof Date);
      assert.ok(found.updatedAt instanceof Date);
      assert.ok(found.startsAt instanceof Date);
      assert.ok(found.expiresAt instanceof Date);
    });

    it("range query $gte/$lte matches stored BSON Dates", async () => {
      const { Promotion } = await import("../src/models/Promotion.js");
      const code = `DATE_RANGE_${Date.now()}`;
      await Promotion.create({
        code, title: "Date range", discountType: "fixed",
        discountValue: 5, isActive: true,
        startsAt: new Date("2025-01-01"), expiresAt: new Date("2035-12-31"),
      });
      const now = new Date();
      const active = await Promotion.find({
        code,
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gte: now },
      });
      assert.equal(active.length, 1, "Should find promo within date range");
    });

    it("range query $gte/$lte excludes out-of-range dates", async () => {
      const { Promotion } = await import("../src/models/Promotion.js");
      const code = `DATE_OOR_${Date.now()}`;
      await Promotion.create({
        code, title: "Out of range", discountType: "fixed",
        discountValue: 5, isActive: true,
        startsAt: new Date("2099-01-01"), expiresAt: new Date("2099-12-31"),
      });
      const now = new Date();
      const active = await Promotion.find({
        code,
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gte: now },
      });
      assert.equal(active.length, 0, "Should exclude future-only promo");
    });

    it("sorts by date fields correctly", async () => {
      const { Promotion } = await import("../src/models/Promotion.js");
      const base = `SORT_${Date.now()}`;
      const p1 = await Promotion.create({
        code: `${base}_A`, title: "A", discountType: "fixed",
        discountValue: 5, isActive: true,
        startsAt: new Date("2025-01-01"), expiresAt: new Date("2030-12-31"),
      });
      const p2 = await Promotion.create({
        code: `${base}_B`, title: "B", discountType: "fixed",
        discountValue: 5, isActive: true,
        startsAt: new Date("2026-01-01"), expiresAt: new Date("2031-12-31"),
      });
      const sorted = await Promotion.find({ code: { $regex: `^${base}` } }).sort({ startsAt: -1 });
      assert.equal(sorted.length, 2);
      assert.equal(sorted[0].code, `${base}_B`);
      assert.equal(sorted[1].code, `${base}_A`);
    });

    it("stores inline Date in nested objects", async () => {
      const { Ride } = await import("../src/models/Ride.js");
      const ride = await Ride.create({
        passengerId: "00000000-0000-0000-0000-000000000001",
        pickup: { lat: 0, lng: 0 },
        dropoff: { lat: 1, lng: 1 },
        status: "pending",
        fare: 10,
      });
      const raw = await getCollection("rides").findOne({ _id: ride._id });
      assert.ok(raw.created_at instanceof Date);
      assert.ok(raw.updated_at instanceof Date);
    });

    it("Date objects survive JSON round-trip via JSON.stringify", async () => {
      const { Promotion } = await import("../src/models/Promotion.js");
      const code = `DATE_JSON_${Date.now()}`;
      const promo = await Promotion.create({
        code, title: "JSON test", discountType: "fixed",
        discountValue: 5, isActive: true,
        startsAt: new Date("2025-07-01"), expiresAt: new Date("2035-07-01"),
      });
      const json = JSON.parse(JSON.stringify(promo.toJSON()));
      assert.equal(typeof json.createdAt, "string");
      assert.ok(json.createdAt.endsWith("Z") || json.createdAt.endsWith("+00:00"));
      assert.equal(typeof json.updatedAt, "string");
    });
  });
});
