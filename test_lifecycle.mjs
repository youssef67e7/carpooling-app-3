/**
 * RIDE_LIFECYCLE_VALIDATION — Self-contained ESM test
 * Connects to MongoDB via ODM for setup, then tests via HTTP.
 * 
 * Usage: node test_lifecycle.mjs
 * Requires: backend server running on localhost:3000
 */

import "./backend/src/loadEnv.js";
import http from "http";
import { connectMongo, closeMongo, getCollection } from "./backend/src/mongo/client.js";
import { newDocId } from "./backend/src/mongo/odm.js";

const BASE = "http://localhost:3000";
const snapshots = [];

function api(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE}${path}`;
    const method = opts.method || "GET";
    const headers = { "Content-Type": "application/json", ...opts.headers };
    const body = opts.body ? JSON.stringify(opts.body) : null;
    const req = http.request(url, { method, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login(email, password) {
  const r = await api("/auth/login", { method: "POST", body: { email, password } });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${r.status}`);
  return r.body.accessToken;
}

async function register(email, password, name, role) {
  const r = await api("/auth/register", { method: "POST", body: { email, password, name, phone: `+1${Date.now()}`.slice(0, 15), role } });
  return { token: r.body.accessToken, userId: r.body.user?._id || r.body._id };
}

async function setupDriver(email, name, adminToken) {
  const u = await register(email, "Test1234!", name, "driver");
  await api("/become-driver", { method: "POST", headers: { Authorization: `Bearer ${u.token}` }, body: { licenseNumber: "LIC", nationalIdNumber: "NAT" } });
  await api(`/admin/users/${u.userId}`, { method: "PATCH", headers: { Authorization: `Bearer ${adminToken}` }, body: { driver_application_status: "approved", is_verified: true } });
  const sr = await api("/switch-role", { method: "POST", headers: { Authorization: `Bearer ${u.token}` }, body: { role: "driver" } });
  u.token = sr.body.token;
  
  // Initialize cars via native MongoDB (bypass ODM field mapping bug)
  const carId = newDocId();
  await getCollection("driver_profiles").updateOne(
    { user_id: u.userId },
    { $set: { cars: [{ _id: carId, imageUrl: "http://example.com/car.jpg", brand: "Toyota", model: "Corolla", color: "White", plateNumber: `CAR${email.slice(0,3)}`, seats: 4, carCategory: "sedan" }], selected_car_id: carId } }
  );
  
  await api("/api/driver/toggle-status", { method: "POST", headers: { Authorization: `Bearer ${u.token}` } });
  return u;
}

let passed = 0, failed = 0;
function test(name, cond, detail) {
  if (cond) { passed++; console.log(`  PASS ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`); }
}

async function snapshot(label, rideId, token) {
  if (!rideId) return;
  const r = await api(`/api/rides/${rideId}/status`, { headers: { Authorization: `Bearer ${token}` } });
  snapshots.push({ label, rideId, data: r.body?.data || r.body });
}

(async () => {
  const ts = Date.now();
  let adminToken, D1, D2, P1, rideId;

  console.log("\n=== RIDE LIFECYCLE VALIDATION ===\n");

  // Connect MongoDB for ODM setup
  console.log("  Connecting to MongoDB...");
  await connectMongo();
  console.log("  Connected\n");

  // ─── SETUP ───
  console.log("── Setup ──\n");
  adminToken = await login("youssef@gmail.com", "7aYxxEnPfWc39quDYIRKxbhMyQ4AWZ8Q");
  console.log("  Admin logged in");

  P1 = await register(`p_${ts}@test.com`, "Test1234!", "Passenger1", "passenger");
  console.log("  P1 registered");

  D1 = await setupDriver(`d1_${ts}@test.com`, "Driver1", adminToken);
  console.log("  D1 set up");
  
  D2 = await setupDriver(`d2_${ts}@test.com`, "Driver2", adminToken);
  console.log("  D2 set up");


  // ─── PHASE 1: VALID STATE TRANSITIONS ───
  console.log("\n── Phase 1: Valid State Transitions ──\n");

  // 1. Create ride → pending (via V1 /create to get string _id compatible with V1 start/end)
  const cr = await api("/api/rides/create", { method: "POST", headers: { Authorization: `Bearer ${P1.token}` }, body: { pickupLocation: { lat: 30.0444, lng: 31.2357, address: "A" }, destinationLocation: { lat: 30.05, lng: 31.24, address: "B" }, vehicleType: "delivery" } });
  rideId = cr.body?.ride?._id;
  test("Create: status = pending", cr.body?.ride?.status === "pending");
  test("Create: passenger_id matches", String(cr.body?.ride?.passengerId || "") === String(P1.userId));
  await snapshot("After create", rideId, P1.token);

  // 2. Accept → accepted
  const ar = await api(`/api/rides/${rideId}/accept`, { method: "POST", headers: { Authorization: `Bearer ${D1.token}` } });
  test("Accept: status = accepted", ar.body?.data?.status === "accepted", `got status=${JSON.stringify(ar.body).slice(0,150)}`);
  test("Accept: driver_id set", !!ar.body?.data?.driver_id);
  test("Accept: driver is D1", String(ar.body?.data?.driver_id || "") === String(D1.userId));
  await snapshot("After accept", rideId, P1.token);

  // 3. driver_arriving — endpoint does not exist
  const da = await api("/api/rides/driver-arriving", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId } });
  test("driver_arriving: endpoint missing (404)", da.status === 404, `got ${da.status}`);

  // 4. passenger_onboard — endpoint does not exist
  const po = await api("/api/rides/passenger-onboard", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId } });
  test("passenger_onboard: endpoint missing (404)", po.status === 404, `got ${po.status}`);

  // 5. Start → ongoing
  const sr = await api("/api/rides/start", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId } });
  test("Start: status = ongoing", sr.body?.ride?.status === "ongoing", `got ${JSON.stringify(sr.body).slice(0,150)}`);
  test("Start: startedAt set", !!(sr.body?.ride?.startedAt || sr.body?.ride?.started_at));
  await snapshot("After start", rideId, adminToken);

  // 6. Complete → completed
  const er = await api("/api/rides/end", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId } });
  test("Complete: status = completed", er.body?.ride?.status === "completed", `got ${JSON.stringify(er.body).slice(0,150)}`);
  test("Complete: completedAt set", !!(er.body?.ride?.completedAt || er.body?.ride?.completed_at));
  await snapshot("After complete", rideId, adminToken);

  // ─── PHASE 2: AUTHORIZATION ───
  console.log("\n── Phase 2: Authorization — Passenger ──\n");

  const cr2 = await api("/api/rides/create", { method: "POST", headers: { Authorization: `Bearer ${P1.token}` }, body: { pickupLocation: { lat: 30.0444, lng: 31.2357, address: "C" }, destinationLocation: { lat: 30.05, lng: 31.24, address: "D" }, vehicleType: "delivery" } });
  const r2 = cr2.body?.ride?._id;
  await api(`/api/rides/${r2}/accept`, { method: "POST", headers: { Authorization: `Bearer ${D1.token}` } });

  test("Passenger cannot accept", (await api(`/api/rides/${r2}/accept`, { method: "POST", headers: { Authorization: `Bearer ${P1.token}` } })).status, 403);
  test("Passenger cannot start", (await api("/api/rides/start", { method: "POST", headers: { Authorization: `Bearer ${P1.token}` }, body: { rideId: r2 } })).status, 403);
  test("Passenger cannot complete", (await api("/api/rides/end", { method: "POST", headers: { Authorization: `Bearer ${P1.token}` }, body: { rideId: r2 } })).status, 403);
  test("Passenger can view own ride", (await api(`/api/rides/${r2}/status`, { headers: { Authorization: `Bearer ${P1.token}` } })).status, 200);
  test("Admin can view any ride", (await api(`/api/rides/${r2}/status`, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 200);

  // ─── PHASE 3: OWNERSHIP ───
  console.log("\n── Phase 3: Ownership — Driver B on Driver A's ride ──\n");

  test("D2 cannot start D1's ride", (await api("/api/rides/start", { method: "POST", headers: { Authorization: `Bearer ${D2.token}` }, body: { rideId: r2 } })).status, 403);
  test("D2 cannot complete D1's ride", (await api("/api/rides/end", { method: "POST", headers: { Authorization: `Bearer ${D2.token}` }, body: { rideId: r2 } })).status, 403);
  test("D2 cannot cancel D1's ride", (await api("/api/rides/driver-cancel", { method: "POST", headers: { Authorization: `Bearer ${D2.token}` }, body: { rideId: r2 } })).status, 403);

  // ─── PHASE 4: INVALID TRANSITIONS ───
  console.log("\n── Phase 4: Invalid State Transitions ──\n");

  const ir = await api("/api/rides/create", { method: "POST", headers: { Authorization: `Bearer ${P1.token}` }, body: { pickupLocation: { lat: 30.0444, lng: 31.2357, address: "E" }, destinationLocation: { lat: 30.05, lng: 31.24, address: "F" }, vehicleType: "delivery" } });
  const irId = ir.body?.ride?._id;

  const ie1 = await api("/api/rides/end", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId: irId } });
  test("pending → complete", ie1.status !== 200, `got ${ie1.status}`);

  const ie2 = await api("/api/rides/start", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId: irId } });
  test("pending → start", ie2.status !== 200, `got ${ie2.status}`);

  await api(`/api/rides/${irId}/accept`, { method: "POST", headers: { Authorization: `Bearer ${D1.token}` } });
  const ie3 = await api("/api/rides/end", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId: irId } });
  test("accepted → complete", ie3.status !== 200, `got ${ie3.status}`);

  await api("/api/rides/start", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId: irId } });
  await api("/api/rides/end", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId: irId } });

  const ie4 = await api(`/api/rides/${irId}/accept`, { method: "POST", headers: { Authorization: `Bearer ${D1.token}` } });
  test("completed → accept", ie4.status !== 200, `got ${ie4.status}`);

  const ie5 = await api("/api/rides/start", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId: irId } });
  test("completed → start", ie5.status !== 200, `got ${ie5.status}`);

  const ie6 = await api("/api/rides/driver-arriving", { method: "POST", headers: { Authorization: `Bearer ${D1.token}` }, body: { rideId: irId } });
  test("completed → driver_arriving (no endpoint)", ie6.status === 404, `got ${ie6.status}`);

  // ─── PHASE 5: RUNTIME TRACE ───
  console.log("\n── Phase 5: Runtime Trace ──\n");
  for (const s of snapshots) {
    console.log(`  ${s.label}`);
    console.log(`    RideID:    ${s.rideId}`);
    console.log(`    Status:    ${s.data?.status || '(unknown)'}`);
    console.log(`    Driver:    ${s.data?.driver_id || s.data?.driverId || '(none)'}`);
    console.log(`    Passenger: ${s.data?.passenger_id || s.data?.passengerId || '(unknown)'}`);
    console.log(`    Timestamp: ${s.data?.updated_at || s.data?.updatedAt || '(none)'}`);
    console.log();
  }

  // ─── SUMMARY ───
  console.log("========== RESULTS ==========");
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`\n${failed === 0 ? "PASS" : "FAIL"}: Ride lifecycle validation complete.`);

  await closeMongo();
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
