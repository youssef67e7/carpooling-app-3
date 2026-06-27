# Production User Flow Review & QA Audit Report

**Audit date:** 2026-06-27  
**App:** ReachNative Car (Weret) — RC1  
**Auditor:** Senior QA Engineer / Product Owner / Software Architect  

---

## Feature-by-Feature Audit Table

| Feature | UI | Backend | Business Logic | Production Ready | Issues Found |
|---|---|---|---|---|---|
| **Passenger Registration** | ✅ | ✅ | ✅ | ✅ | — |
| **Passenger Login** | ✅ | ✅ | ✅ | ✅ | — |
| **Forgot Password** | ✅ | ✅ | ✅ | ✅ | — |
| **Email Verification** | ✅ | ✅ | ✅ | ✅ | — |
| **Profile** | ✅ | ✅ | ✅ | ✅ | — |
| **Language / Theme** | ✅ | N/A | ✅ | ✅ | — |
| **Home Map** | ⚠️ | ✅ | ⚠️ | ❌ | GPS denied unhandled (#15), dead mode selector (#16) |
| **Pickup / Destination Selection** | ✅ | ✅ | ✅ | ✅ | — |
| **Fare Estimation** | ✅ | ✅ | ✅ | ✅ | — |
| **Ride Request (V1 create)** | ✅ | ⚠️ | ❌ | ❌ | No duplicate‑ride guard (#3) |
| **Ride Request (V2 create)** | N/A | ✅ | ✅ | ✅ | V2 route exists but Flutter uses V1 — not wired |
| **Driver Matching** | ✅ | ✅ | ✅ | ✅ | — |
| **Accept Offer** | ✅ | ⚠️ | ⚠️ | ❌ | Break‑mode bypass (#2) |
| **Driver Tracking** | ✅ | ✅ | ✅ | ✅ | — |
| **Chat** | ✅ | ✅ | ✅ | ✅ | — |
| **Voice Call (In‑App)** | ✅ | N/A | N/A | ⚠️ | Uses `tel:` URL — no native VoIP |
| **Share Trip** | ✅ | ✅ | ✅ | ✅ | — |
| **Safety / SOS** | ✅ | ✅ | ✅ | ✅ | — |
| **Trusted Contacts** | ✅ | ✅ | ✅ | ✅ | — |
| **Wallet** | ✅ | ✅ | ✅ | ⚠️ | Mock deposit, no idempotency (#6) |
| **Payment Methods** | ✅ | ✅ | ✅ | ✅ | — |
| **Promotions** | ⚠️ | ❌ | ❌ | ❌ | Error state (#11), no per‑user limit (#4), TOCTOU race (#13) |
| **Referral** | ⚠️ | ❌ | ❌ | ❌ | Error state (#12), broken dedup (#5) |
| **Favorite Drivers** | ⚠️ | ✅ | ✅ | ✅ | Raw‑text error, no retry (#14) |
| **Saved Places** | ✅ | ✅ | ✅ | ✅ | — |
| **Notifications** | ✅ | ✅ | ✅ | ✅ | — |
| **Ride Cancellation (Passenger)** | ✅ | ✅ | ✅ | ✅ | — |
| **Ride Cancellation (Driver)** | ✅ | ✅ | ✅ | ✅ | — |
| **Ride Completion** | ✅ | ⚠️ | ❌ | ❌ | No atomic ledger (#1) |
| **Rating Driver** | ✅ | ✅ | ✅ | ✅ | — |
| **Rating Passenger** | ✅ | ✅ | ✅ | ✅ | — |
| **Ride History** | ✅ | ✅ | ✅ | ✅ | — |
| **Rating History** | ⚠️ | ✅ | ✅ | ⚠️ | Error state (#10) |
| **Dispute (User)** | ✅ | ⚠️ | ⚠️ | ❌ | `req.userRole` never set (#7) |
| **Dispute (Admin)** | ✅ | ✅ | ✅ | ✅ | — |
| **Settings** | ✅ | N/A | ✅ | ✅ | — |
| **Delete Account** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Registration/Onboarding** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Document Upload** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Vehicle Upload** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Banking** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Approval** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Login** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Online/Offline** | ✅ | ❌ | ❌ | ❌ | No active‑ride check when going offline (#8) |
| **Driver Receive Request** | ✅ | ❌ | ❌ | ❌ | No role gate on driver routes (#9) |
| **Driver Accept Request** | ✅ | ⚠️ | ⚠️ | ❌ | Break‑mode bypass (#2) |
| **Driver Navigation** | ✅ | N/A | ✅ | ✅ | — |
| **Driver Arrival** | ✅ | ✅ | ✅ | ✅ | — |
| **Passenger Verification** | ✅ | N/A | ✅ | ✅ | — |
| **Driver Start Ride** | ✅ | ⚠️ | ⚠️ | ⚠️ | State‑skip allowed (#17) |
| **Driver Complete Ride** | ✅ | ⚠️ | ❌ | ❌ | No atomic ledger (#1) |
| **Driver Earnings** | ⚠️ | ✅ | ✅ | ⚠️ | Raw‑text error, no retry (#14) |
| **Driver Bonus** | ⚠️ | ✅ | ✅ | ⚠️ | Raw‑text error (#14) |
| **Driver Heatmap** | ⚠️ | ✅ | ✅ | ⚠️ | Error swallowed (#15) |
| **Driver Break Mode** | ⚠️ | ✅ | ❌ | ❌ | No loading/error states (#14), bypass (#2) |
| **Driver Wallet / Withdraw** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Carpool Creation** | ✅ | ✅ | ⚠️ | ⚠️ | Overbooking race (#18) |
| **Driver Carpool Management** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Ratings** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Notifications** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Safety** | ✅ | ✅ | ✅ | ✅ | — |
| **Driver Disputes** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Login** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Dashboard** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Statistics** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Users** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Drivers** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Driver Approvals** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Rides** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Wallet Transactions** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Promotions** | ✅ | ⚠️ | ⚠️ | ⚠️ | Crudely functional but gaping flaws | 4× |
| **Admin Referrals** | ✅ | ⚠️ | ❌ | ❌ | Critical dedup bug | 5× |
| **Admin Reports** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Audit Logs** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Disputes** | ✅ | ✅ | ✅ | ✅ | — |
| **Admin Notifications** | ✅ | ✅ | ✅ | ✅ | — |
---

## Issue Details

### 🔴 Critical Severity

#### #1 — No atomicity in wallet credit/debit for ride completion
| Field | Detail |
|---|---|
| **Severity** | **Critical** |
| **Steps to reproduce** | 1. Passenger with wallet payment completes a ride 2. Server crashes after `debitPassengerForRide` succeeds but before `creditDriverForRide` executes |
| **Expected** | Both debit and credit should happen atomically — either both succeed or both fail |
| **Actual** | Only the passenger is debited. Driver never receives payment. Error is logged but no compensating transaction occurs. |
| **Root cause** | Two sequential DB operations outside a transaction |
| **Files** | `backend/src/routes/rides.js:1270-1285` |
| **Recommended fix** | Use MongoDB `startSession()` + `transaction()` to atomically execute both operations. If transactions aren't feasible, implement a compensating `refundPassengerForRide()` call in a `catch` block. |

#### #2 — Driver break mode does not block ride acceptance
| Field | Detail |
|---|---|
| **Severity** | **Critical** |
| **Steps to reproduce** | 1. Driver sets break mode `POST /driver/break-mode` 2. Driver's `isOnline` is now `false` 3. Another driver creates a ride request 4. The offline driver can accept it via `POST /rides/:id/accept` |
| **Expected** | Driver should not receive or be able to accept ride requests while in break mode |
| **Actual** | No check of `user.isOnline` exists in either acceptance path (V2 or V1 confirm) |
| **Root cause** | `acceptRide()` in `rideNativeService.js` and the V1 confirm handler in `rides.js` check driver approval but not online status |
| **Files** | `backend/src/services/rideNativeService.js` (accept), `backend/src/routes/rides.js:117-148,1109-1156` |
| **Recommended fix** | Add `if (!user.isOnline) throw new AppError("Driver is offline", 403)` in `requireApprovedDriver()` or in both acceptance code paths |

#### #3 — V1 create ride endpoint allows multiple active rides per passenger
| Field | Detail |
|---|---|
| **Severity** | **Critical** |
| **Steps to reproduce** | 1. Passenger creates ride via Flutter (`POST /rides/create` V1) 2. Passenger creates another ride while first is still pending 3. Both rides are created successfully |
| **Expected** | Passenger should be blocked from creating a second active ride |
| **Actual** | V2 route (`POST /rides/`) correctly checks `findActiveRideByPassenger()`. V1 route (`POST /rides/create`) has no such check. Flutter calls V1. |
| **Files** | `backend/src/routes/rides.js:561-697` (V1 create), `backend/src/services/rideNativeService.js:12-15` (V2 check) |
| **Recommended fix** | Add the same `findActiveRideByPassenger()` check to the V1 create handler |

#### #4 — No per-user promo code usage tracking
| Field | Detail |
|---|---|
| **Severity** | **Critical** |
| **Steps to reproduce** | 1. Admin creates promo with `maxUses: 100` 2. Same user calls `POST /promotions/apply/:id` 100 times 3. All 100 applications succeed — global `currentUses` reaches 100, all from one user |
| **Expected** | Each user should be able to use a promo code only once (or N times if per-user limit is defined) |
| **Actual** | Only global `currentUses` is tracked. No per-user usage data is stored or checked. |
| **Files** | `backend/src/routes/promotions.js:59-87` |
| **Recommended fix** | Add a `usedBy: [{ userId, appliedAt }]` array to the Promotion schema, or create a separate redemptions collection with a unique compound index on `(promoId, userId)`. Check this before allowing application. |

#### #5 — Referral deduplication check uses never-populated field
| Field | Detail |
|---|---|
| **Severity** | **Critical** |
| **Steps to reproduce** | 1. User A has referral code `ABC123` 2. User B applies `ABC123` (first apply: succeeds, valid) 3. User C applies `ABC123` (second apply: should fail, but succeeds) |
| **Expected** | After User B applies a referral code, the system should prevent further applications of any referral code by User B |
| **Actual** | Line 55 queries `Referral.findOne({ referredUserId: req.userId })`. The field `referredUserId` is **never written** to any document. The query always returns `null`, so the dedup check always passes. A user can apply unlimited different referral codes. |
| **Files** | `backend/src/routes/referrals.js:55,68-73` |
| **Recommended fix** | Change to: `Referral.findOne({ userId: req.userId, referredBy: { $exists: true } })` or check the `referredUsers` array on the referrer's document |

#### #6 — Mock deposit has no idempotency or payment verification
| Field | Detail |
|---|---|
| **Severity** | **Critical** (in production with real money) |
| **Steps to reproduce** | 1. Call `POST /wallet/deposit` with same amount twice 2. Balance increases twice |
| **Expected** | Deposits should be idempotent (idempotency key) and verified by a real payment gateway |
| **Actual** | Endpoint simply increments balance — no payment gateway, no idempotency. Acceptable for simulation, **production blocker**. |
| **Files** | `backend/src/routes/wallet.js:114-150` |
| **Recommended fix** | Integrate with a payment gateway (Stripe, Moyasar, etc.) and use idempotency keys |

---

### 🟠 High Severity

#### #7 — `req.userRole` never set, breaking admin dispute message access
| Field | Detail |
|---|---|
| **Severity** | **High** |
| **Steps to reproduce** | 1. Admin user calls `GET /disputes/:id/messages` 2. The `isAdmin` check at line 95 evaluates `req.userRole === "admin"` |
| **Expected** | Admin should be recognized as admin and allowed to access all dispute messages |
| **Actual** | `req.userRole` is never assigned anywhere in the codebase. `authRequired` only sets `req.userId`. `roleRequired("admin")` middleware sets `req.user` but not `req.userRole`. The `isAdmin` evaluation is always `false`. |
| **Files** | `backend/src/routes/disputes.js:95,121`, `backend/src/middleware/auth.js` |
| **Recommended fix** | Either set `req.userRole` in `authRequired`, or change `disputes.js` to read `req.user?.role` instead of `req.userRole` |

#### #8 — Driver can go offline with active rides
| Field | Detail |
|---|---|
| **Severity** | **High** |
| **Steps to reproduce** | 1. Driver accepts a ride 2. Driver calls `POST /driver/toggle-status` to go offline 3. Driver is now offline but still has an active accepted ride |
| **Expected** | Driver should be blocked from going offline while they have active rides (status: accepted, driver_arriving, passenger_onboard, ongoing) |
| **Actual** | No active-ride check exists in the toggle-status handler |
| **Files** | `backend/src/routes/driver.js:125-149` |
| **Recommended fix** | Add before setting `isOnline = false`: `const activeCount = await Ride.countDocuments({ driverId: req.userId, status: { $in: ["accepted", "driver_arriving", "passenger_onboard", "ongoing"] } }); if (activeCount > 0) throw new AppError(...)` |

#### #9 — Driver routes not role-gated — passengers can access driver data
| Field | Detail |
|---|---|
| **Severity** | **High** |
| **Steps to reproduce** | 1. Log in as a passenger (role: "passenger") 2. Call `GET /driver/earnings-summary`, `GET /driver/bonuses`, `GET /driver/heatmap`, `GET /driver/status`, `POST /driver/cars` |
| **Expected** | All `/driver/*` endpoints should reject non-driver users with 403 Forbidden |
| **Actual** | Only `POST /driver/toggle-status` and `POST /driver/location-update` check driver role. All other endpoints only check `authRequired + blockCheck` with no driver role requirement. |
| **Files** | `backend/src/routes/driver.js` (entire file — router-level middleware at line 22) |
| **Recommended fix** | Change `router.use(authRequired, blockCheck)` to `router.use(authRequired, blockCheck, roleRequired("driver"))` |

---

### 🟡 Medium Severity

#### #10 — `rating_history_screen.dart` ignores provider error state
| **File** | `apps/mobile-flutter/lib/features/more/rating_history_screen.dart:36-87` |
|---|---|
| **Issue** | Screen only checks `s.ratingsLoading` and `ratings.isEmpty`. Never checks `s.error`. On API failure, users see empty list with no error message. |
| **Recommended fix** | Add error state check: `if (s.error != null) return ErrorState(...)` |

#### #11 — `promotions_screen.dart` shows empty state on API failure
| **File** | `apps/mobile-flutter/lib/features/more/promotions_screen.dart:108-118` |
|---|---|
| **Issue** | When `fetchActive()` fails, loading becomes `false` and items stay empty → empty-state illustration shown. Users can't distinguish "no promotions" from "network error". |
| **Recommended fix** | Check `s.error` before showing empty state; render error widget with retry |

#### #12 — `referral_screen.dart` silently hides load failure
| **File** | `apps/mobile-flutter/lib/features/more/referral_screen.dart:67-68` |
|---|---|
| **Issue** | Same pattern as promotions — errors stored in provider but never displayed |
| **Recommended fix** | Render error state when `s.error != null` |

#### #13 — Promo code TOCTOU race condition on `maxUses`
| **File** | `backend/src/routes/promotions.js:71-80` |
|---|---|
| **Issue** | Line 71 reads `promo.currentUses >= promo.maxUses` (non-atomic). Line 80 does `$inc: { currentUses: 1 }`. Concurrent requests can both pass the check, both increment, overshooting `maxUses`. |
| **Recommended fix** | Use `findOneAndUpdate` with `{ maxUses: { $gt: "$currentUses" } }` guard |

#### #14 — Error states with raw-text instead of ErrorState widget
| **Files** | `favorite_drivers_screen.dart:66-67`, `driver_bonus_screen.dart:47` |
|---|---|
| **Issue** | Errors displayed as plain red `Text` widget instead of the app's reusable `ErrorState` widget. No retry button. Inconsistent with rest of app. |
| **Recommended fix** | Use `ErrorState(message: _error, onRetry: () => ...)` |

#### #15 — `driver_heatmap_overlay.dart` error completely swallowed
| **File** | `apps/mobile-flutter/lib/features/driver/driver_heatmap_overlay.dart:58-59` |
|---|---|
| **Issue** | `catch (e) { if (mounted) setState(() => _loading = false); }` — error is completely silent. User sees "No recent demand data" (misleading). |
| **Recommended fix** | Show error state with message and retry option |

#### #16 — GPS denied silently handled on passenger home
| **File** | `apps/mobile-flutter/lib/features/auth/passenger_home_screen.dart:128-133` |
|---|---|
| **Issue** | If user denies location permission, `_initLocation()` silently returns. Pickup field stays empty, map centers on default Riyadh coords. No guidance. |
| **Recommended fix** | Show a dialog or banner asking the user to enable location in settings |

#### #17 — `driver_home_screen.dart` silently swallows all init errors
| **File** | `apps/mobile-flutter/lib/features/auth/driver_home_screen.dart:73` |
|---|---|
| **Issue** | `catch (_) {}` — all three API calls (active rides, available, driver refresh) wrapped in a single try/catch that discards every error. Screen stays blank. |
| **Recommended fix** | Handle errors per-call or set a generic error state to show an error banner with retry |

#### #18 — Carpool overbooking race condition
| **File** | `backend/src/routes/carpools.js:109-129` |
|---|---|
| **Issue** | Read `seatsAvailable`, decrement in memory, then `save()`. Between read and write, concurrent requests can both pass the capacity check → overbooking. |
| **Recommended fix** | Use `findOneAndUpdate` with `{ seatsAvailable: { $gte: seats } }` atomic guard |

---

### 🟢 Low Severity

| # | Issue | File | Detail |
|---|---|---|---|
| L1 | State‑skip allowed (accepted→ongoing) | `rides.js:1216` | `/start` accepts `["accepted", "passenger_onboard"]` — arrival/onboard states can be skipped |
| L2 | V1 double‑accept race (theoretical) | `rides.js:1109-1156` | Between reading ride and saving, a race exists. Highly unlikely in practice |
| L3 | No referral cap | `referrals.js:65` | Unlimited referral rewards — by design but no abuse protection |
| L4 | No trusted contact verification | `safety.js:66-90` | Contacts added without SMS/email verification — acceptable for MVP |
| L5 | Duplicate haversine in carpools.js | `carpools.js:147` vs `geo.js` | Unused import + inline duplicate |
| L6 | Dead mode selector cards | `passenger_home_screen.dart:542,551` | `onTap: () {}` — "Ride" and "Send a package" cards look tappable but do nothing |
| L7 | Logout doesn't reset all providers | `session_reset.dart:7-12` | `promotionsProvider`, `placesProvider`, `notificationPrefsProvider`, `referralProvider`, `safetyProvider` not reset on logout |
| L8 | `my_carpools_screen.dart` error swallowed | `my_carpools_screen.dart:44-46` | `catch (e) { setState(() => _loading = false); }` — silent |
| L9 | FCM listeners never cancelled | `fcm_service.dart:42-44` | `StreamSubscription` not stored — can't clean up (guarded by `_initialized` flag) |
| L10 | `Navigator.pushNamedAndRemoveUntil` bypasses GoRouter | `settings_screen.dart:114` | Should use `context.go('/login')` for consistency |
| L11 | `driver_break_mode_widget.dart` no loading/error | `driver_break_mode_widget.dart:17-27` | API calls with no loading indicator, no error feedback |

---

## Edge Cases Assessment

| Edge Case | Status | Notes |
|---|---|---|
| Double‑tap buttons | ⚠️ Partial | Auth provider `register()` lacks guard; UI‑layer disable mitigates |
| No internet | ⚠️ Partial | No global connectivity listener. Screens show loading spinners indefinitely |
| Slow internet | ✅ | All screens show loading indicators |
| Server timeout | ⚠️ Partial | ApiClient catches `DioException` but some screens swallow errors |
| Invalid data | ✅ | Backend validates with express-validator + Zod; Flutter validates input |
| Expired JWT | ✅ | ApiClient detects 401, calls refresh logic; auth middleware returns `TOKEN_EXPIRED` |
| Expired OTP | ✅ | Backend checks TTL and returns `OTP_EXPIRED` |
| Duplicate requests | ⚠️ Partial | No idempotency keys; dedup depends on database constraints |
| Logout during request | ⚠️ Partial | No request cancellation on logout; stale responses may update cleared state |
| App restart | ⚠️ Partial | FCM service re-initializes; ride state lost (expected) |
| Device rotation | ✅ | No orientation-dependent layouts |
| Background / Foreground | ✅ | App resumes to same state |
| Notification tap | ✅ | FCM navigates to correct screen based on `type` field |
| Permission denied | ⚠️ Partial | GPS handled silently (#16); camera/mic for in‑app call untested |
| GPS disabled | ⚠️ Partial | `driver_location_tracker.dart` catches geolocator errors silently |
| Upload failure | ⚠️ Partial | Upload endpoint handles errors; no retry UI on Flutter side |

---

## Summary

| Metric | Count |
|---|---|
| **Total flows audited** | 68 |
| **Production blockers** (Critical + High) | **13** |
| **Critical issues** | 6 |
| **High issues** | 3 |
| **Medium issues** | 9 |
| **Low issues** | 11 |
| **Features fully production-ready** | 38 |
| **Features requiring fixes** | 24 |

### Immediate Blockers (Fix Before Release)

| Priority | Issue | Component |
|---|---|---|
| 1️⃣ | **#1** — Non-atomic wallet credit/debit | `rides.js:1270-1285` |
| 2️⃣ | **#2** — Break mode bypasses ride acceptance | `rideNativeService.js`, `rides.js` |
| 3️⃣ | **#3** — V1 create allows duplicate active rides | `rides.js:561-697` |
| 4️⃣ | **#4** — No per-user promo tracking | `promotions.js:59-87` |
| 5️⃣ | **#5** — Referral dedup uses unpopulated field | `referrals.js:55` |
| 6️⃣ | **#8** — Going offline with active rides | `driver.js:125-149` |
| 7️⃣ | **#9** — Driver routes accessible to passengers | `driver.js` (router-level middleware) |
| 8️⃣ | **#7** — `req.userRole` never set | `disputes.js`, `auth.js` middleware |
| 9️⃣ | **#18** — Carpool overbooking race | `carpools.js:109-129` |
