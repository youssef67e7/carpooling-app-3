# Blocked User Validation Report

**Date:** 2026-06-25  
**Server:** `http://localhost:3000`  
**Auth Middleware:** `authRequired` → `blockCheck` → `roleRequired(...)`  

---

## Summary

Verified that all ride actions are denied for blocked user accounts (both passenger and driver). The `blockCheck` middleware correctly intercepts requests after JWT validation and before role or handler logic.

---

## Test Accounts

| Role | Email | Action | Status |
|------|-------|--------|--------|
| Blocked Passenger | `bp_1782406457475@test.com` | Registered → Admin PATCH `is_blocked: true` | ✅ Blocked |
| Blocked Driver | `bd_1782406457475@test.com` | Registered → Admin PATCH `is_blocked: true` | ✅ Blocked |

---

## Results

### Blocked Passenger

| # | Endpoint | Expected | Actual | Result |
|---|----------|----------|--------|--------|
| 1 | `POST /api/rides` (Create ride) | 403 | 403 | ✅ PASS |
| 2 | `GET /api/rides/:id/status` (View ride status) | 403 | 403 | ✅ PASS |
| 3 | `POST /api/rides/cancel` (Cancel ride) | 403 | 403 | ✅ PASS |

### Blocked Driver

| # | Endpoint | Expected | Actual | Result |
|---|----------|----------|--------|--------|
| 4 | `GET /api/rides/requested` (View available rides) | 403 | 403 | ✅ PASS |
| 5 | `POST /api/rides/:id/accept` (Accept ride) | 403 | 403 | ✅ PASS |
| 6 | `POST /api/rides/start` (Start ride) | 403 | 403 | ✅ PASS |
| 7 | `POST /api/rides/end` (Complete ride) | 403 | 403 | ✅ PASS |

**7/7 PASS**

---

## Middleware Chain Verification

The `blockCheck` middleware (defined in `backend/src/middleware/auth.js:41-66`) is present in all ride routes:

**V2 endpoints** (lines 65-130):
```
router.post("/", authRequired, blockCheck, roleRequired("passenger", "admin"), ...)
router.get("/requested", authRequired, blockCheck, roleRequired("driver", "admin"), ...)
router.post("/:id/accept", authRequired, blockCheck, roleRequired("driver", "admin"), ...)
router.get("/:id/status", authRequired, blockCheck, ...)
```

**Protected endpoints** (all routes registered after line 132):
```
router.use(authRequired, blockCheck);   // line 132 — applies to all subsequent routes
  ↓
  POST /cancel       (line 1000)
  POST /start        (line 914)
  POST /end          (line 940)
  ...all other ride endpoints...
```

---

## Blocking Mechanism

Blocking is applied via `PATCH /admin/users/:userId` with `{"is_blocked": true}` (uses `AdminAccount` middleware stack: `authRequired` → `blockCheck` → `roleRequired("admin")` → `fixedAdminOnly`).

When `blockCheck` runs for a blocked user:

```
is_blocked = true, blocked_until = null
  → res.status(403).json({ message: "Account blocked" })
```

The request never reaches the handler, ensuring zero bypass risk.

**Verdict: ✅ PASS — `blockCheck` correctly prevents all ride actions for blocked users.**
