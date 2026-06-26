# Feature Status by Phase

> Status: ✅ Done | 🔧 In Progress | ⬜ Not Started | ❌ Blocked

---

## Phase 6 — Authentication

| Feature | Status | Notes |
|---|---|---|
| Email OTP login | ✅ | `POST /auth/email/send-otp`, `POST /auth/email/verify-otp`, Flutter email step |
| Google Sign-In | ✅ | Firebase SHA-1 configured, web+android OAuth clients, verified working |
| Password reset via email | ✅ | 3-step: email → OTP → new password in `ForgotPasswordScreen` |
| Refresh token flow | ✅ | Full rotation + revocation, 7-day TTL, SHA-256 hashed, anti-reuse detection |
| Session management | ✅ | Auth interceptor auto-refreshes on 401, `clearLocalSession()` on block/expiry |
| Delete account | ✅ | `POST /auth/delete-account` with cascade + settings UI with password/confirmation |

**Summary**: Phase 6 complete.

---

## Phase 7 — Notifications (FCM)

| Event | Status | Backend | Flutter |
|---|---|---|---|
| Ride accepted | ✅ | `notifyRideAccepted()` in rides.js | FCM foreground banner, background tap → ride-chat |
| Driver verified | ✅ | `notifyDriverVerified()` in admin.js | Foreground banner |
| Driver rejected | ✅ | `notifyDriverRejected()` in admin.js | Foreground banner |
| Ride cancelled | ✅ | `notifyRideCancelled()` in ride cancel routes | Notification to other party |
| Driver arrived | ✅ | `notifyDriverArrived()` in `/arriving` | FCM to passenger |
| Passenger onboard | ✅ | `notifyPassengerOnboard()` in `/onboard` | FCM to passenger |
| Trip started | ✅ | `notifyTripStarted()` in `/start` | FCM to passenger |
| Trip completed | ✅ | `notifyTripCompleted()` in `/end` | FCM to both |
| New chat message | ✅ | `notifyNewMessage()` in `/messages` POST | FCM to recipient |
| Wallet deposit | ✅ | `notifyWalletDeposit()` in wallet ledger | FCM to user |
| Wallet withdrawal | ✅ | `notifyWalletWithdrawal()` in wallet ledger | FCM to user |
| Payment received | ✅ | `notifyPaymentReceived()` in `/end` | FCM to driver |
| Refund processed | ⬜ | No `notifyRefundProcessed` function exists | — |
| Report resolved | ⬜ | No `notifyReportResolved` function exists | — |
| Admin broadcast | ⬜ | No `POST /admin/broadcast` endpoint | — |

**Flutter**: `FcmService.initialize()` handles foreground (in-app banner), background (navigate to ride-chat), and terminated state.

**Summary**: 12/14 events covered. Missing: refund processed + report resolved notifications. No admin broadcast.

---

## Phase 8 — Ride Experience

| Feature | Status | Notes |
|---|---|---|
| Driver arriving | ✅ | `POST /rides/:id/arriving` + FCM |
| Passenger onboard | ✅ | `POST /rides/:id/onboard` + FCM |
| Start trip | ✅ | `POST /rides/start` + FCM |
| End trip | ✅ | `POST /rides/end` + FCM + payment processing |
| Cancel ride (passenger) | ✅ | `POST /rides/:id/cancel` + FCM |
| Cancel ride (driver) | ✅ | `POST /rides/:id/driver-cancel` + FCM |
| Passenger rating | ✅ | `POST /rides/rate` modal on completion |
| Driver rates passenger | ⬜ | No endpoint or UI exists |
| Ride history (passenger) | ✅ | `PassengerHistoryScreen`, paginated |
| Ride history (driver) | ✅ | `DriverHistoryScreen`, paginated |
| Chat | ✅ | 10s polling, paginated history, FCM on new message |

**Summary**: 9/10 items done. Only "driver rates passenger" is missing.

---

## Phase 9 — Maps

| Feature | Status | Notes |
|---|---|---|
| Pickup marker | ✅ | `flutter_map` with OpenStreetMap tiles |
| Destination marker | ✅ | Dual marker in `WeretRideMap` |
| Route preview | ✅ | Polyline from Mapbox/OSRM routing |
| Static driver location | ✅ | Polled from ride data, displayed on map |
| ETA on refresh | ✅ | Calculated in route preview |
| Nearby drivers display | ✅ | Markers for available drivers |
| Polling (15-30s) | ✅ | `DriverHomeScreen` and ride status polling |

**Map library**: `flutter_map` (OpenStreetMap) — no Google Maps SDK dependency.

**Summary**: Complete. All map features implemented with OSM as free alternative to Google Maps.

---

## Phase 10 — Wallet

| Feature | Status | Notes |
|---|---|---|
| Top up | ✅ | Multi-step: account selection → amount → success screen |
| Withdraw | ✅ | 2-step: request → OTP confirmation |
| Earnings display | ✅ | `DriverEarningsWalletScreen` with gradient header |
| Receipts | ✅ | Transaction history with type icons |
| Transaction history | ✅ | `WalletHistoryScreen` paginated, all types |
| Add/delete accounts | ✅ | Multiple account types (cash, instapay, vodafone, card) |
| Deposit (passenger) | ✅ | `WalletDepositScreen` |
| Transfer | ✅ | Top-up flow in driver wallet |
| Refund display | ✅ | `ride_refund` shown as credit (green +) |

**Summary**: Complete. Wallet works for both passenger and driver roles.

---

## Phase 11 — Driver Features

| Feature | Status | Notes |
|---|---|---|
| Vehicle management | ✅ | `DriverCarsScreen` — list, add, set active |
| Driver documents | ✅ | Upload via `DriverOnboardingScreen` (driver's license, vehicle registration) |
| Online/Offline toggle | ✅ | `POST /driver/toggle-status`, `POST /driver/location-update` |
| Driver availability | ✅ | `GET /rides/available` returns online drivers |
| Earnings dashboard | ✅ | `DriverEarningsScreen` with total, trips, rating |
| Wallet (driver) | ✅ | `DriverEarningsWalletScreen` with top-up, deposit, withdraw |
| Driver application flow | ✅ | Submit → pending → approved/rejected, with FCM notification |
| Driver verification status | ✅ | `DriverVerificationStatusScreen` with rejected state + admin note |

**Summary**: Complete. All driver features implemented.

---

## Phase 12 — Admin

| Feature | Status | Notes |
|---|---|---|
| Dashboard statistics | ✅ | KPIs (users, rides, drivers online, etc.), chart, activity feed |
| User search | ✅ | Paginated with moderation (block, verify, approve, delete) |
| Driver search | ✅ | Same user search with role filter |
| Ride search | ✅ | Paginated with status filter |
| Wallet management | ✅ | Transaction search, flag/unflag suspicious |
| Broadcast notifications | ⬜ | No `POST /admin/broadcast` endpoint |
| CSV export | ⬜ | No CSV endpoints on backend |
| Audit logs | ✅ | `AdminAuditLog`, paginated, action/target search |
| Report management | ✅ | Status transitions (open → reviewing → resolved/dismissed) |
| Tools | ✅ | Stats overview screen |
| Admin web panel | ✅ | `https://.../admin-ui/` with Google sign-in + email login |

**Summary**: 7/9 items done. Missing: broadcast notifications + CSV export.

---

## Phase 13 — Production

| Feature | Status | Notes |
|---|---|---|
| Crash reporting | ⬜ | Not configured |
| Analytics | ⬜ | Not configured |
| Backups | ⬜ | MongoDB Atlas has auto-backups (default) |
| Health checks | ✅ | `GET /health` returns DB status + collection counts |
| Rate limiting | ✅ | `express-rate-limit`: 500/15m global, 30/15m for auth |
| Database indexes | ✅ | 30+ indexes across all collections via `ensureMongoIndexes()` |
| Monitoring | ⬜ | Not configured |
| Deployment | ✅ | Vercel production, `.vercelignore`, env vars configured |
| ObjectId fix | ✅ | ODM auto-converts 24-char hex `_id` to ObjectId |

**Summary**: 3/7 done. Backups handled by MongoDB Atlas automatically. Missing: crash reporting, analytics, monitoring.

---

## Overall Progress

| Phase | Complete | Total |
|---|---|---|
| Phase 6 — Auth | 6 | 6 |
| Phase 7 — Notifications | 12 | 14 |
| Phase 8 — Ride Experience | 9 | 10 |
| Phase 9 — Maps | 7 | 7 |
| Phase 10 — Wallet | 9 | 9 |
| Phase 11 — Driver Features | 8 | 8 |
| Phase 12 — Admin | 7 | 9 |
| Phase 13 — Production | 3 | 7 |
| **Total** | **61** | **70** |

**87% complete** across all phases.
