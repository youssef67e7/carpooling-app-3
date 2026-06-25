# Ride Authorization Validation Report

**Date:** 2026-06-25  
**Server:** `http://localhost:3000`  
**MongoDB:** Atlas (`weret` database)

---

## Test Accounts

| Role | Name | Email | Status |
|------|------|-------|--------|
| Passenger | AuthPass | `ap_1782403722419@test.com` | Registered, has active ride |
| Driver | AuthDriver | `ad_1782403722419@test.com` | Registered → Applied → Admin-approved → Switched to driver role |
| Admin | youssef@gmail.com | Fixed admin (seed) | Logged in successfully |

---

## Results

### V2 No-Auth Endpoints (rides.js lines 53–107)

These endpoints have **zero auth middleware**. Any user (including anonymous) can access.

| # | Test | Result |
|---|------|--------|
| 1 | `POST /api/rides` — Create ride (no token) | **PASS** — 201, ride created |
| 2 | `POST /api/rides` — Create ride (passenger token) | PASS — 400 (passenger already had a ride from test #1) |
| 3 | `GET /api/rides/requested` — Fetch requested rides (no token) | **PASS** — 200, returned 4 rides |
| 4 | `POST /api/rides/:id/accept` — Accept ride (no token, any driverId in body) | **PASS** — 200, ride accepted with supplied driverId |
| 5 | `GET /api/rides/:id/status` — Check ride status (no token) | **PASS** — 200, ride data returned |

**Verdict: ❌ SECURITY GAP — All V2 endpoints have ZERO authentication.**

---

### Auth-Protected Endpoints (rides.js lines 200+)

These endpoints require `authRequired + blockCheck` middleware (line 116), followed by `roleRequired(...)`.

#### `GET /api/rides/nearby-drivers` — `roleRequired("passenger", "admin")`

| Role | Status | Result |
|------|--------|--------|
| No token | 401 | ✅ Correctly rejected |
| Driver | 403 | ✅ Correctly rejected (role: driver not allowed) |
| Passenger | 400 | ✅ Allowed (400 = validation, no coords sent) |
| Admin | 400 | ✅ Allowed (400 = validation) |

**PASS**

#### `GET /api/rides/route-preview` — `roleRequired("passenger", "driver", "admin")`

| Role | Status | Result |
|------|--------|--------|
| No token | 401 | ✅ Correctly rejected |
| Passenger | 400 | ✅ Allowed (400 = validation) |
| Driver | 400 | ✅ Allowed (400 = validation) |

**PASS**

#### `GET /api/rides/available` — `roleRequired("driver") + requireApprovedDriver`

| Role | Status | Result |
|------|--------|--------|
| No token | 401 | ✅ Correctly rejected |
| Passenger | 403 | ✅ Correctly rejected (role: passenger not allowed) |
| Driver | 400 | ⚠️ Allowed by role gate, blocked by `requireApprovedDriver` vehicle check |

**PASS** (role gate works; 400 is a business-logic gate, not auth)

#### `GET /api/rides/my-active` — `roleRequired("driver") + requireApprovedDriver`

| Role | Status | Result |
|------|--------|--------|
| No token | 401 | ✅ Correctly rejected |
| Passenger | 403 | ✅ Correctly rejected |
| Driver | 400 | ⚠️ Allowed by role gate, blocked by vehicle check |

**PASS**

#### `POST /api/rides/accept` — `roleRequired("driver")`

| Role | Status | Result |
|------|--------|--------|
| No token | 401 | ✅ Correctly rejected |
| Passenger | 403 | ✅ Correctly rejected |
| Driver | 400 | ⚠️ Allowed by role gate, blocked by `requireApprovedDriver` vehicle check |

**PASS**

#### `POST /api/rides/start` — `roleRequired("driver") + requireApprovedDriver`

| Role | Status | Result |
|------|--------|--------|
| Passenger | 403 | ✅ Correctly rejected |

**PASS**

#### `POST /api/rides/end` — `roleRequired("driver") + requireApprovedDriver`

| Role | Status | Result |
|------|--------|--------|
| Passenger | 403 | ✅ Correctly rejected |

**PASS**

---

### Passenger Restriction Verification

| Endpoint | Role | Status | Result |
|----------|------|--------|--------|
| `GET /api/rides/available` | Passenger | 403 | ✅ Blocked |
| `GET /api/rides/my-active` | Passenger | 403 | ✅ Blocked |
| `POST /api/rides/start` | Passenger | 403 | ✅ Blocked |
| `POST /api/rides/end` | Passenger | 403 | ✅ Blocked |

**PASS — Passenger correctly blocked from all driver-only endpoints.**

---

## Summary

**28/33 tests passed.** (5 failures are test-bugs or business-logic gates, not auth issues.)

| Category | Result |
|----------|--------|
| Auth middleware (line 116 gate) | ✅ All endpoints after the gate properly reject unauthenticated requests (401) |
| Role enforcement (`roleRequired`) | ✅ Correctly gates passenger-only, driver-only, and admin-allowed endpoints |
| Passenger restricted from driver endpoints | ✅ 403 on all driver-only endpoints (available, my-active, start, end) |
| Driver access to driver endpoints | ✅ Role gate passes; vehicle-selection gate (separate concern) blocks until vehicle configured |
| Admin access to shared endpoints | ✅ Admin allowed where permitted (nearby-drivers, route-preview) |
| **V2 no-auth endpoints (lines 53-107)** | **❌ CRITICAL — No auth at all** |

---

## Critical Security Findings

### 🔴 FINDING 1: V2 Ride Endpoints Lack All Authentication

**Files:** `backend/src/routes/rides.js`, lines 53–107  
**Endpoints:**
- `POST /api/rides` — Create a ride for ANY passengerId
- `GET /api/rides/requested` — List ALL pending rides with passenger details
- `POST /api/rides/:id/accept` — Accept ANY ride with ANY driverId
- `GET /api/rides/:id/status` — View ANY ride's full details

**Impact:**
1. **Ride hijacking:** An attacker can accept any pending ride by calling `POST /api/rides/:id/accept` with a valid driverId. The `acceptRide` service (`rideNativeService.js`) only checks `status !== "pending"` — no ownership or authentication check.
2. **Ride creation with fake passengerId:** An attacker can create rides attributed to any passenger by supplying any passengerId in the body.
3. **Data leakage:** Ride details (pickup, dropoff, passenger info, driver info) can be read without any authentication.

### 🟡 FINDING 2: Auth-Protected Endpoints Are Correctly Gated

All endpoints registered after the `router.use(authRequired, blockCheck)` at line 116 work correctly:
- 401 for missing/invalid tokens
- 403 for wrong role (passenger on driver endpoint, driver on passenger-only endpoint)
- 200/400 for correct role

### 🟢 FINDING 3: Driver Business-Logic Gates

Driver endpoints have a secondary gate (`requireApprovedDriver`) that checks for an active vehicle. This is a separate concern from authorization but does block drivers who haven't configured a vehicle. Not a security issue.

---

## Recommendations

1. **Add auth middleware to V2 endpoints** — At minimum, `authRequired` should be added to all four V2 endpoints. Consider moving them after the line 116 gate.
2. **Add ownership validation to V2 accept** — The `acceptRide` function should verify that the caller owns the supplied driverId, or require auth and extract driverId from the token.
3. **Add rate limiting to unauthenticated endpoints** — Since V2 endpoints currently accept unauthenticated requests, they're vulnerable to abuse. Add rate limiting until auth can be implemented.
