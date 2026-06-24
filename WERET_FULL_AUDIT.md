# WERET — Full Pre-Implementation Audit

> Repository: `ReachNative Car`
> Generated: 2026-06-24
> Scope: Complete technical audit across 11 phases for free-tier migration (Vercel Hobby + MongoDB Atlas M0 + Cloudinary Free + Firebase FCM)

---

## Phase 1: Repository Overview

### Structure

```
ReachNative Car/
├── backend/                          # Node.js/Express API (ESM, ~6,500 lines)
│   ├── api/index.js                  # Vercel serverless entry point
│   ├── src/
│   │   ├── index.js                  # Local server entry (Socket.io + HTTP)
│   │   ├── createApp.js              # Express app factory (shared local+Vercel)
│   │   ├── db.js                     # MongoDB connection + seed orchestration
│   │   ├── loadEnv.js                # dotenv loader
│   │   ├── uploadPaths.js            # Local file upload path helpers
│   │   ├── config/fixedAdmins.js     # Fixed admin email list
│   │   ├── errors/AppError.js        # Custom error class
│   │   ├── middleware/               # auth, blockCheck, roleRequired, driverGate, rateLimiters, fixedAdmin, errorHandler, validateRequest, docId
│   │   ├── models/                   # 16 ODM model definitions
│   │   ├── mongo/                    # ODM layer: client.js, odm.js, schema.js, fieldMap.js
│   │   ├── routes/                   # 12 route files
│   │   ├── services/                 # 9 services
│   │   ├── realtime/io.js            # Socket.io room helpers + emit wrapper
│   │   ├── utils/                    # geo, directions, phoneOtp, emailOtp, signUserToken, OAuth, seatUnits
│   │   ├── jobs/simulateMovement.js  # Driver movement simulation
│   │   ├── seed/                     # seedDemoPlatform, seedMockDrivers, seedVehicles
│   │   └── firestore/                # EMPTY directory
│   ├── scripts/                      # dev scripts
│   └── test/                         # 6 test files
├── apps/
│   ├── mobile-flutter/               # Flutter mobile app (120+ Dart files, Riverpod, GoRouter, Dio)
│   └── web/                          # Standalone admin SPA (JS, 1562 lines app.js)
├── shared/                           # Shared JS constants
├── assets/                           # Brand assets + images
├── scripts/                          # Root scripts
├── docs/ + dcs/                      # Documentation (mirrored)
├── _restore/                         # Old mobile assets backup
├── .github/workflows/build-android-apk.yml
├── docker-compose.yml                # Local MongoDB
├── firebase.json                     # Dead Firebase config
└── package.json                      # Monorepo root (npm scripts only)
```

### Key Facts

| Attribute | Value |
|-----------|-------|
| Backend runtime | Node.js 22+ ESM |
| Framework | Express 4 |
| Database | MongoDB Atlas (with local/in-memory fallback) |
| ODM | Custom in-memory (loads ALL docs from collection into JS) |
| Auth | JWT + Google OAuth + bcrypt |
| Real-time | Socket.io (WebSocket) |
| Mobile | Flutter (Riverpod, GoRouter, Dio, flutter_map) |
| Admin web | Vanilla JS (no framework, 1562 lines) |
| File uploads | multer → local disk |
| Rate limiting | express-rate-limit (disabled on Vercel) |
| Validation | express-validator |
| Testing | `node --test` |
| CI/CD | GitHub Actions (manual APK build only) |
| No TypeScript | No ESLint | No Prettier |

---

## Phase 2: Architecture Analysis

### Flutter Architecture

- **State Management**: Riverpod (`flutter_riverpod`)
- **Routing**: GoRouter with shell routes (passenger/driver/admin tab navigation)
- **Networking**: Dio HTTP client
- **Auth**: Google Sign-In native plugin + JWT in SharedPreferences
- **Maps**: flutter_map (Leaflet) with configurable tile provider
- **Location**: geolocator plugin
- **Real-time**: socket_io_client (Socket.io WebSocket)
- **UI**: Custom design system (WERET tokens, no Material UI)
- **Localization**: `easy_localization` with Arabic/English JSON files

### Backend Architecture

```
Mobile App ──HTTP──► Express API ──ODM──► MongoDB Atlas
     │                                        │
     └──WebSocket (Socket.io)◄──emit──────────┘
                            │
                     Admin Web Panel (HTTP)
```

Key architectural decisions:
- Custom in-memory ODM (`mongo/odm.js`) wraps MongoDB driver
- Every `find()`, `countDocuments()`, `updateOne()` loads ALL documents into JS memory
- All filtering, sorting, pagination, aggregation happens in JavaScript
- Field name mapping via `fieldMap.js`: camelCase ↔ snake_case
- No TypeScript, no type safety

### Auth Flow

1. **Registration**: Email+password (bcrypt hashed) or Google OAuth ID token or Phone OTP
2. **JWT Issuance**: `signUserToken()` creates JWT with `{ sub, role }` using `JWT_SECRET`
3. **Request Validation**: `authRequired` middleware verifies JWT on every protected route
4. **Block Check**: `blockCheck` middleware checks `is_blocked` / `blocked_until` after auth
5. **Role Gate**: `roleRequired("driver")` checks `active_role` or `role` field

### Ride Lifecycle

```
pending → (driver proposes fare) → awaitingDriverConfirm → accepted → ongoing → completed
                                                           → cancelled (by driver or passenger)
```

1. Passenger creates ride → status `pending`, saved in `rides` collection
2. Drivers see ride via `GET /rides/available` (filtered by vehicleType)
3. Driver submits price offer via `POST /rides/accept` → `driverProposal` embedded
4. Passenger accepts/rejects via `POST /rides/respond-proposal`
5. If accepted → status `awaitingDriverConfirm` → driver confirms via `POST /rides/driver-confirm-booking`
6. If confirmed → status `accepted`, driver assigned
7. Driver starts ride → `ongoing`, ends ride → `completed`
8. Passenger rates driver after completion

### File Upload Flow

1. Mobile app picks image → sends multipart POST to `/upload`
2. `multer.diskStorage()` writes to local filesystem
3. Path: `{uploadRoot}/{public|private}/{userId}/{timestamp}-{random}.{ext}`
4. Response: `{ url: "/uploads/public/{userId}/{filename}", storage: "local" }`
5. **Public files**: Served via `express.static`
6. **Private files**: Served via auth-gated route `GET /uploads/private/:userId/:file`

---

## Phase 3: Backend Audit — Endpoint Inventory

### Auth Routes (`/auth`)

| Method | Path | Auth | Rate-Limited | Description |
|--------|------|------|-------------|-------------|
| GET | `/google-config` | No | No | Returns Google OAuth client IDs |
| POST | `/google` | No | Yes | Google ID token sign-in |
| POST | `/register` | No | Yes | Email+password registration |
| GET | `/me` | JWT | No | Current user profile |
| PATCH | `/profile` | JWT+block | No | Update name, phone, image, vehicleType |
| POST | `/phone/otp` | No | Yes | Request phone OTP |
| POST | `/phone/verify` | No | Yes | Verify phone OTP + login/register |
| POST | `/login` | No | Yes | Email+password login |
| POST | `/verify-password` | JWT+block | No | Re-verify password |
| POST | `/forgot-password` | No | Yes | Request email password reset OTP |
| POST | `/reset-password` | No | Yes | Reset password with OTP |

### Ride Routes (`/rides`) — JWT + blockCheck on ALL

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/nearby-drivers` | passenger/admin | Online drivers near location |
| GET | `/route-preview` | any | Route polyline preview |
| POST | `/create` | passenger | Create ride request |
| POST | `/pool-matches` | passenger | Find compatible pool rides |
| POST | `/join` | passenger | Join pooled ride |
| GET | `/available` | driver+approved | Pending rides for driver |
| GET | `/my-active` | driver+approved | Driver's active rides |
| POST | `/accept` | driver+approved | Submit/update price offer |
| POST | `/withdraw-offer` | driver+approved | Withdraw pending offer |
| POST | `/respond-proposal` | passenger | Accept/reject driver offer |
| POST | `/passenger-min-fare` | passenger | Update minimum fare |
| POST | `/driver-confirm-booking` | driver+approved | Confirm after passenger accepts |
| POST | `/driver-cancel` | driver+approved | Cancel accepted ride |
| POST | `/start` | driver+approved | Start ride (accepted→ongoing) |
| POST | `/end` | driver+approved | End ride (ongoing→completed) |
| POST | `/cancel` | passenger | Cancel pending/accepted ride |
| POST | `/rate` | passenger | Rate driver after completion |
| GET | `/ratings/received` | driver | View driver's ratings |
| GET | `/history` | any | Ride history (role-based filtering) |
| GET | `/:rideId/messages` | participant | Get ride chat messages |
| POST | `/:rideId/messages` | participant | Send chat message |
| GET | `/:rideId` | participant/admin | Get ride detail |

### Driver Routes (`/driver`) — JWT + blockCheck

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/status` | any | Driver application status |
| GET | `/dashboard` | any | Full driver dashboard (stats) |
| GET | `/earnings-summary` | any | Earnings overview |
| POST | `/toggle-status` | any | Go online/offline |
| POST | `/cars` | any | Add car to profile |
| PATCH | `/cars/:carId` | any | Update car details |
| DELETE | `/cars/:carId` | any | Remove car |
| PATCH | `/cars/:carId/set-active` | any | Set active car |
| POST | `/location-update` | driver+approved | Update location (emits Socket.io) |

### Passenger Routes (`/passenger`) — JWT + blockCheck + roleRequired

| Method | Path | Description |
|--------|------|-------------|
| POST | `/location-update` | Update passenger location |

### Wallet Routes (`/wallet`) — JWT + blockCheck + roleRequired("passenger","driver")

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List wallets |
| POST | `/accounts` | Create wallet account |
| DELETE | `/accounts/:id` | Remove empty wallet |
| POST | `/deposit` | Mock deposit |
| POST | `/withdraw/request` | Request withdrawal OTP |
| POST | `/withdraw/confirm` | Confirm withdrawal |
| GET | `/transactions` | Transaction history |

### Admin Routes (`/admin`) — JWT + blockCheck + roleRequired("admin") + fixedAdminOnly

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users (paginated) |
| PATCH | `/users/:userId` | Update user (verify, block, approve driver) |
| DELETE | `/users/:userId` | Delete user |
| GET | `/reports` | List reports (paginated) |
| PATCH | `/reports/:id` | Update report status |
| GET | `/transactions` | List transactions (paginated, filterable) |
| PATCH | `/transactions/:id/flag` | Flag transaction |
| GET | `/audit` | Audit log (paginated) |
| GET | `/rides` | List rides (paginated) |
| GET | `/stats` | Dashboard KPI stats (11+ queries) |

### Other Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/upload` | JWT+block | Upload image (multer) |
| POST | `/driver-application/*` | JWT | Driver onboarding |
| PATCH | `/role-switch` | JWT | Switch passenger/driver |
| POST | `/ai/search` | JWT | AI search |
| GET | `/vehicles` | any | Vehicle type catalog |
| POST | `/reports` | JWT | Report user |

**Total Endpoints: ~56**

---

## Phase 4: Database Audit

### 16 Collections

| Collection | Models | Documents | Indexes | TTL | Growth Rate | Large Doc Risk |
|------------|--------|-----------|---------|-----|-------------|----------------|
| `users` | User | Few (dev) | email, google_sub (unique) | No | Low | No |
| `rides` | Ride | Few | passenger_id, driver_id | No | Medium | routePath array |
| `driver_profiles` | DriverProfile | Few | None | No | Low | cars[] embedded |
| `driver_documents` | DriverDocuments | Few | None | No | Low | No |
| `passenger_profiles` | PassengerProfile | Few | None | No | Low | No |
| `bookings` | Booking | Few | None | No | Medium | No |
| `messages` | Message | Few | None | No | High | Chat grows fastest |
| `wallet_accounts` | WalletAccount | Few | user_id | No | Low | No |
| `transactions` | Transaction | Few | user_id+created_at | No | Medium | No |
| `withdrawal_requests` | WithdrawalRequest | Few | None | No | Low | No |
| `reports` | Report | Few | None | No | Low | No |
| `admin_audit_logs` | AdminAuditLog | Few | None | No | Medium | Unbounded |
| `admin_accounts` | AdminAccount | 2 | None | No | None | No |
| `phone_login_otps` | PhoneLoginOtp | Few | None | **Missing** | Low | No |
| `email_password_reset_otps` | EmailPasswordResetOtp | Few | None | **Missing** | Low | No |
| `vehicles` | Vehicle | 8 | None | No | None | No |

### Critical ODM Limitation

The custom ODM (`mongo/odm.js:233`) loads **every document** from a collection into memory:

```js
async function loadCollectionDocs(model) {
  const rows = await getCollection(model.tableName).find({}).toArray();
  // All filtering, sorting, pagination happens in JS
}
```

This means:
- `User.countDocuments()` loads ALL users
- `Ride.find({ status: "pending" })` loads ALL rides, filters in JS
- `Ride.aggregate()` loads ALL rides, groups in JS
- MongoDB indexes (schema.js:59-66) are **never used** by queries
- At scale (>50K documents), Atlas free tier 512MB RAM will be exhausted

### Missing Indexes (14 total)

| Collection | Needed Index | Affected Queries |
|------------|-------------|-----------------|
| `rides` | `{ status: 1, vehicle_type: 1 }` | Driver "available" feed |
| `rides` | `{ driver_id: 1, status: 1 }` | Driver active/history |
| `rides` | `{ passenger_id: 1, status: 1 }` | Passenger history |
| `rides` | `{ created_at: -1 }` | Admin ride listing |
| `messages` | `{ ride_id: 1, created_at: 1 }` | Chat retrieval |
| `messages` | `{ created_at: 1 }` (TTL) | Auto-cleanup |
| `transactions` | `{ user_id: 1, created_at: -1 }` | Wallet history |
| `phone_login_otps` | `{ expires_at: 1 }` (TTL) | Auto-cleanup |
| `email_password_reset_otps` | `{ expires_at: 1 }` (TTL) | Auto-cleanup |
| `admin_audit_logs` | `{ created_at: -1 }` | Admin audit listing |
| `reports` | `{ status: 1, created_at: -1 }` | Admin reports |
| `users` | `{ phone: 1 }` | Phone OTP login |
| `users` | `{ active_role: 1, is_online: 1 }` | Nearby drivers |

### Duplicate / Redundant Fields

| Field | Location | Issue |
|-------|----------|-------|
| `carImageUrl` | `driver_profiles` (top-level) | Duplicates `cars[0].imageUrl` — backwards compat |
| `vehicleType` | `users` | Duplicates data in driver_profile |
| `parcel` object | `rides` | Shipping metadata on ALL rides, most don't use |
| `routePath` | `rides` | Large lat/lng arrays, rarely needed after booking |

### Schema Suitability for MongoDB Atlas Free (512MB)

- Current dev data is negligible
- At scale: `routePath` + `messages` + `admin_audit_logs` will be primary storage drivers
- ODM loading entire collections into memory is the PRIMARY risk for free tier RAM limits
- Need TTL indexes on OTP and audit log collections

---

## Phase 5: Realtime Audit

| Feature | Current | Frequency | Bandwidth | Cost | Replacement |
|---------|---------|-----------|-----------|------|-------------|
| **Ride feed** (new rides to drivers) | Socket.io `ride:update` to `roomDrivers(vt)` | Per ride create (~1/sec) | ~2KB/event | Free | REST polling `GET /rides/available` every 5s |
| **Ride status updates** | Socket.io `ride:update` to `roomRide(id)` | On transitions | ~2KB/event | Free | REST `GET /rides/:id` every 3-5s |
| **Chat messages** | Socket.io `ride:message` | Per message (~1/30s) | ~1KB | Free | REST `POST + GET ?since=` every 2-3s |
| **Typing indicators** | Socket.io `ride:typing` | Per keystroke | ~200B | Free | Remove (optional) |
| **Driver location** | Socket.io `driver:location` to active rides | Every 3-5s | ~200B | Free | Embed in ride detail, update every 5s |
| **WebRTC signaling** | Socket.io `webrtc:signal` relay | Per call | ~2KB | Free | Remove or direct P2P |
| **Admin live dashboard** | Not implemented (dead comment) | — | — | — | REST polling every 15s |

### Migration Difficulty: LOW-MEDIUM

Socket.io is purely a notification overlay — all state is in MongoDB. Migration replaces `io.emit()` with "client polls API" pattern. No server-push synchronization needed.

### Polling Design (Target)

| Poll | Endpoint | Interval | Max Payload |
|------|----------|----------|-------------|
| Available rides (driver) | `GET /rides/available?vt=X` | 5s | ~5KB |
| Active rides (driver) | `GET /rides/my-active` | 5s | ~3KB |
| Ride detail (passenger) | `GET /rides/:id` | 3s | ~8KB |
| Chat messages | `GET /rides/:id/messages?since=T` | 2s | ~2KB |
| Driver location | embedded in ride detail | 5s | — |
| History (passenger/driver) | `GET /rides/history` | 30s | ~10KB |
| Admin stats | `GET /admin/stats` | 15s | ~15KB |
| Admin users/rides/etc | `GET /admin/*?page=N` | on navigate | ~10KB |

---

## Phase 6: Third-Party Services

| Service | Purpose | Required? | Can Remove? | Current Status | Est. Monthly Cost |
|---------|---------|-----------|-------------|----------------|-------------------|
| **MongoDB Atlas** | All data storage | **YES** | No | Active (Cluster0) | Free (M0: 512MB) |
| **Google Sign-In** | OAuth authentication | Optional | Yes (use email+password) | Active (3 client IDs in .env) | Free |
| **Socket.io** | Real-time events | No | **Should replace** | Active | Free (self-hosted) |
| **Twilio** | SMS for phone OTP | Optional | Yes (use console mode) | Not configured (commented out) | ~$0.0079/SMS |
| **OpenAI** | AI search | Optional | Yes | Route exists, may be unused | Variable |
| **Cloudinary** | Image uploads/storage | **YES** *(planned)* | N/A | Not yet implemented | Free (25GB) |
| **Firebase FCM** | Push notifications | **YES** *(planned)* | N/A | Not yet implemented | Free |
| **Firebase Auth/FS/RTDB/Storage** | — | No | **YES — remove** | Dead code, never used | N/A |
| **Mapbox** | Map tiles (via flutter_map) | Optional | Yes (use OSM free tiles) | Configurable | Free tier |

### Dead/Unused Services

| Service | Evidence |
|---------|----------|
| Firebase Auth | Zero `firebase-admin` imports. Google Sign-In uses own OAuth |
| Firestore | Empty `src/firestore/` directory. Zero Firestore operations |
| Realtime Database | Zero references anywhere |
| Firebase Storage | Zero `getStorage()` or bucket references |
| Twilio | Env vars commented out. `SMS_CONSOLE_MODE=1` routes around it |

---

## Phase 7: Infrastructure Audit

| Component | Current State | Target State | Status |
|-----------|--------------|--------------|--------|
| **Hosting** | Local dev server (localhost:3000) | Vercel (Hobby) | Partial — vercel.json exists |
| **Database** | MongoDB Atlas Cluster0 | MongoDB Atlas M0 Free | Ready — URI in .env |
| **File storage** | Local disk (backend/uploads/) | Cloudinary | Not implemented |
| **Push notifications** | None | Firebase Cloud Messaging | Not implemented |
| **Environment variables** | backend/.env (plaintext) | Vercel encrypted env vars | Needs migration |
| **Secrets** | Committed to git (.env) | Vercel env vars / .env.example only | **CRITICAL** — exposed |
| **Domain** | localhost:3000 | Unknown | Missing |
| **SSL** | None (dev) | Vercel auto-HTTPS | Ready |
| **CI/CD** | GitHub Actions (manual APK) | GitHub Actions + Vercel deploy | Needs expansion |

### Vercel Hobby Limits vs. Estimated Usage

| Metric | Limit | Estimated Need | Verdict |
|--------|-------|---------------|---------|
| Bandwidth | 100 GB/month | ~80 GB/month (with 5-10s polling) | **MARGINAL** — needs optimization |
| Serverless invocations | 10/sec burst | ~73/sec peak | **EXCEEDS** — needs caching |
| Function timeout | 10s (30s max) | 30-100ms avg | OK |
| Response size | 50 MB | <10 KB avg | OK |
| Build minutes | 6000/month | ~100 | OK |
| WebSockets | **Not supported** | N/A | Socket.io must be removed |

---

## Phase 8: Free Tier Analysis

### Features That Fit Free Tiers

| Feature | Tier | Limit | Fit |
|---------|------|-------|-----|
| Database storage | Atlas M0 | 512 MB | OK initially |
| Image storage | Cloudinary Free | 25 GB | OK |
| Push notifications | Firebase FCM | Unlimited | OK |
| Map tiles | OSM/Mapbox Free | 50K-100K loads | OK |
| Auth (email+pw) | Self-hosted | Unlimited | OK |
| Google Sign-In | Google OAuth | 10K req/day | OK |

### Features That EXCEED Free Tiers

| Feature | Reason | Classification | Mitigation |
|---------|--------|---------------|------------|
| **Socket.io** | Not supported on Vercel serverless | Required | Replace with REST polling |
| **Local file uploads** | Ephemeral on Vercel (/tmp) | Required | Migrate to Cloudinary |
| **Bandwidth at 2s polling** | 420 GB/month > 100 GB limit | Required | Increase to 5-10s polling |
| **ODM full-collection loads** | RAM limit on Atlas M0 (512MB) | Required | Rewrite ODM to use native queries |
| **Function invocations** | 73/sec > 10/sec burst | Required | Add caching layer |
| **Admin stats (11+ queries)** | Unnecessary load | Optional | Cache for 10-30s |

### Classification Summary

| Feature | Classification | Action |
|---------|---------------|--------|
| Ride booking & lifecycle | **Required** | Keep as-is, optimize DB queries |
| Driver ride feed | Required | Polling (5s interval) |
| Passenger ride tracking | Required | Polling (3s interval) |
| Chat | Required | REST with `?since=` filter |
| Driver location | Required | Embedded in ride detail (5s) |
| File uploads | Required | Cloudinary |
| Push notifications | Required | Firebase FCM |
| Admin dashboard | Optional | Cache stats, increase polling |
| WebRTC calling | Future | Remove from Socket.io, rebuild later |
| Typing indicators | Future | Remove |
| AI search | Optional | Keep if used, else remove |
| SMS (Twilio) | Optional | Console mode for dev, Twilio later |
| Live admin dashboard | Remove | Remove dead feature comment |

---

## Phase 9: Conflict Detection

### Critical Issues

| # | Issue | Location | Explanation |
|---|-------|----------|-------------|
| 1 | **ODM is incorrect by design** | `mongo/odm.js:233` | Loads ALL docs into memory. Every query is a full collection scan in JS. MongoDB indexes never used. |
| 2 | **`aggregate()` is a mock** | `mongo/odm.js:575-617` | Only `$match` + `$group` with `$sum`. No `$sort`, `$lookup`, `$unwind`, `$project`. Admin stats call loads ALL rides. |
| 3 | **No TTL indexes on OTPs** | `PhoneLoginOtp`, `EmailPasswordResetOtp` | Stale documents accumulate forever |
| 4 | **No TTL on audit logs** | `admin_audit_logs` | Unbounded growth |
| 5 | **Rate limiting disabled on Vercel** | `rateLimiters.js:9-10` | Empty middleware on Vercel |
| 6 | **CORS allows all origins** | `createApp.js:44` | No origin whitelist |

### Security Issues

| # | Issue | Location | Risk |
|---|-------|----------|------|
| 1 | Plaintext admin passwords in .env | `.env:39-40` | **HIGH** |
| 2 | MongoDB credentials in committed .env | `.env:5` | **HIGH** |
| 3 | Default JWT secret in code | `index.js:18` | **HIGH** |
| 4 | No rate limiting on Vercel | `rateLimiters.js` | MEDIUM |
| 5 | CORS open to all origins | `createApp.js:44` | MEDIUM |

### Dead Code

| # | File | Reason |
|---|------|--------|
| 1 | `src/firestore/` | Empty directory |
| 2 | `firebase.json` | References non-existent firestore.rules |
| 3 | `backend/firebase-service-account.json` | Zero consumers |
| 4 | `android/app/google-services.json` | Placeholder pkg names, no Firebase dependency |
| 5 | `User.js:5` — `firebaseUid` | Never populated or queried |
| 6 | `services/uploadStorage.js` | Returns hardcoded "local", never read |
| 7 | 6 favicon files in `apps/web/` | Unreferenced |
| 8 | `.env` comment about `ADMIN_FIRESTORE_LIVE` | Dead feature reference |

### Duplicate APIs

| Endpoint 1 | Endpoint 2 | Issue |
|------------|------------|-------|
| `GET /driver/status` | `GET /driver-application/status` | Overlapping driver status |
| `POST /passenger/location-update` | `POST /driver/location-update` | Same logic, different roles |

### Tight Coupling

- ODM model names are directly used as MongoDB collection names (`tableName`)
- Socket.io event names hardcoded across route files
- Admin panel i18n mixed with DOM (`data-i18n` attributes directly in HTML)
- Flutter providers directly import API endpoints (no API abstraction layer)

---

## Phase 10: Migration Roadmap

### Task 1 — ODM Rewrite

- **Objective**: Replace in-memory ODM with native MongoDB queries (push filter/sort/limit to DB)
- **Files affected**: `mongo/odm.js`, `mongo/fieldMap.js`, `mongo/schema.js`, all 16 models, all routes
- **Dependencies**: None
- **Risk**: HIGH — touches every data operation
- **Testing**: Run 6 existing tests + manual ride lifecycle test
- **Rollback**: Revert `odm.js` to prior version
- **Infrastructure**: None
- **Outcome**: Queries use MongoDB indexes, collections no longer loaded in memory

### Task 2 — Replace Socket.io with REST Polling

- **Objective**: Remove WebSocket dependency for Vercel compatibility
- **Files affected**: `src/index.js`, `src/realtime/io.js`, `src/routes/rides.js`, `src/routes/driver.js`; Flutter: `realtime/socket_service.dart`, `realtime/realtime_bridge.dart`
- **Dependencies**: None
- **Risk**: MEDIUM — changes real-time UX
- **Testing**: Manual ride lifecycle with polling intervals
- **Rollback**: Re-enable Socket.io
- **Infrastructure**: None
- **Outcome**: All realtime features work via REST with 5-10s polling

### Task 3 — Migrate File Uploads to Cloudinary

- **Objective**: Replace local disk storage with Cloudinary CDN
- **Files affected**: `src/routes/uploads.js`, `src/uploadPaths.js`, `src/services/uploadStorage.js`, `src/createApp.js`
- **Dependencies**: None
- **Risk**: LOW — isolated to upload path
- **Testing**: POST /upload, verify Cloudinary URL returned
- **Rollback**: Revert to disk storage
- **Infrastructure**: Cloudinary account + env vars
- **Outcome**: Images served via Cloudinary CDN, signed URLs for private images

### Task 4 — Remove Dead Firebase Code

- **Objective**: Delete unused Firebase artifacts
- **Files affected**: `firebase.json`, `backend/firebase-service-account.json`, `android/app/google-services.json`
- **Dependencies**: None
- **Risk**: LOW — all unused
- **Testing**: Verify auth still works
- **Rollback**: Restore deleted files
- **Infrastructure**: None
- **Outcome**: Clean codebase, no Firebase references

### Task 5 — Remove Unused Favicon Files

- **Objective**: Delete 6 unreferenced favicon files
- **Files affected**: `apps/web/favicon-{16,32,48,64,128,192,512}.png`
- **Dependencies**: None
- **Risk**: NONE
- **Testing**: Verify favicon still loads
- **Rollback**: Restore files
- **Infrastructure**: None
- **Outcome**: 6 files removed, ~100KB saved

### Task 6 — Add Missing Database Indexes

- **Objective**: Create MongoDB indexes for common queries
- **Files affected**: `mongo/schema.js`
- **Dependencies**: Task 1 (ODM rewrite) — indexes matter only after queries push to DB
- **Risk**: LOW — createIndex is idempotent
- **Testing**: Verify no duplicate index errors
- **Rollback**: Drop indexes via MongoDB shell
- **Infrastructure**: MongoDB Atlas
- **Outcome**: All 14+ missing indexes created

### Task 7 — Add TTL Indexes + Audit Log Archiving

- **Objective**: Auto-expire OTPs, cap audit log growth
- **Files affected**: `mongo/schema.js`
- **Dependencies**: Task 1
- **Risk**: LOW
- **Testing**: Verify auto-cleanup behavior
- **Rollback**: Drop TTL indexes
- **Outcome**: Auto-cleanup of stale data

### Task 8 — Implement FCM Push Notifications

- **Objective**: Build push notification infrastructure
- **Files affected**: New `src/services/pushNotifications.js`, route for device token registration; Flutter: add `firebase_messaging`
- **Dependencies**: Task 4 (separate — Firebase removal and FCM are independent)
- **Risk**: MEDIUM — new feature
- **Testing**: Trigger ride event, verify notification on device
- **Rollback**: Remove FCM code and Flutter dependency
- **Infrastructure**: Firebase project with Cloud Messaging enabled
- **Outcome**: Push notifications on ride events

### Task 9 — Secure Secrets

- **Objective**: Remove plaintext secrets from .env, regenerate credentials
- **Files affected**: `backend/.env`, `backend/.env.example`
- **Dependencies**: None
- **Risk**: LOW
- **Testing**: Verify app starts with new env vars
- **Rollback**: Restore original .env
- **Infrastructure**: Vercel project with env vars set
- **Outcome**: No secrets in repository

### Task 10 — Enable Rate Limiter on Vercel

- **Objective**: Rate limiting works on Vercel (currently disabled)
- **Files affected**: `middleware/rateLimiters.js`
- **Dependencies**: Task 2 (removes Socket.io)
- **Risk**: LOW
- **Testing**: Verify rate limit response after threshold
- **Rollback**: Revert to no-op
- **Infrastructure**: None
- **Outcome**: Rate limiting active on all environments

### Task 11 — CORS + Security Hardening

- **Objective**: Restrict CORS origins, tighten Helmet CSP
- **Files affected**: `createApp.js`
- **Dependencies**: None
- **Risk**: LOW
- **Testing**: Verify mobile app can still connect
- **Rollback**: Revert CORS config
- **Infrastructure**: None
- **Outcome**: Origin whitelist, proper security headers

### Task 12 — Admin Stats Caching

- **Objective**: Cache `/admin/stats` for 10-30s
- **Files affected**: `routes/admin.js`
- **Dependencies**: Task 1
- **Risk**: LOW
- **Testing**: Verify dashboard updates
- **Rollback**: Remove caching
- **Infrastructure**: None
- **Outcome**: 11+ queries/dashboard load reduced to 1 per 10s

### Task 13 — Remove Duplicate Collection Counts from Admin

- **Objective**: Remove `countMongoCollections` from `/admin/stats`
- **Files affected**: `routes/admin.js`
- **Dependencies**: None
- **Risk**: LOW
- **Testing**: Verify admin dashboard renders
- **Rollback**: Re-add count call
- **Infrastructure**: None
- **Outcome**: Removes 16+ countDocuments per dashboard load

### Task 14 — Clean Up Localization Dead Strings

- **Objective**: Remove Firestore-related localization strings
- **Files affected**: `apps/mobile-flutter/lib/l10n/{ar,en}.json`
- **Dependencies**: Task 4
- **Risk**: NONE
- **Testing**: Verify app still translates
- **Rollback**: Restore strings
- **Infrastructure**: None
- **Outcome**: Clean localization files

### Task 15 — Optimize Polling Bandwidth

- **Objective**: Tune polling intervals to fit Vercel free tier bandwidth
- **Files affected**: Flutter providers, admin app.js
- **Dependencies**: Task 2
- **Risk**: LOW
- **Testing**: Verify ride lifecycle UX acceptable
- **Rollback**: Revert intervals
- **Infrastructure**: None
- **Outcome**: Bandwidth from ~420 GB/month → ~80 GB/month (within Hobby limit)

---

## Phase 11: Missing Infrastructure Checklist

### Backend

| Item | Status | Notes |
|------|--------|-------|
| ☐ MongoDB Atlas (M0 Free) | **Exists** | URI in .env, Cluster0 |
| ☐ Vercel Project | Partial | vercel.json exists, project not linked |
| ☐ Environment Variables | Partial | In .env but not in Vercel |
| ☐ JWT Secret | **Exists (insecure)** | Plaintext in .env — must be rotated |
| ☐ Google OAuth Credentials | **Exists** | 3 client IDs in .env |
| ☐ Firebase Project | **Exists** | `youssef-f757e` — FCM not yet enabled |
| ☐ Firebase Service Account | **Exists (unused)** | `firebase-service-account.json` |
| ☐ Cloudinary Account | **Missing** | Need Cloud Name + API Key + API Secret |
| ☐ Twilio (if retained) | Missing | SID + Token + From Number |

### Flutter

| Item | Status | Notes |
|------|--------|-------|
| ☐ Android package name | Placeholder | `com.example.ecommerce_app` — needs real name |
| ☐ iOS bundle identifier | Placeholder | `$(PRODUCT_BUNDLE_IDENTIFIER)` — needs real value |
| ☐ Firebase google-services.json | Placeholder | Wrong package names, no Firebase Flutter dep |
| ☐ Google Sign-In config | Partial | Client IDs exist in backend, not in Flutter .env |
| ☐ Notification config | Missing | No FCM on Flutter side |

### Deployment

| Item | Status | Notes |
|------|--------|-------|
| ☐ Domain | **Missing** | Unknown |
| ☐ HTTPS | Provided by Vercel | Auto |
| ☐ CORS configuration | Open (all origins) | Needs whitelist |
| ☐ Production env vars | Partial | Need to migrate from .env to Vercel |

---

## Questions That Must Be Answered Before Implementation

1. **Domain**: What domain will the API use in production?
2. **Vercel**: Do you have a Vercel account/project linked? What is the project name?
3. **Cloudinary**: What are your Cloudinary credentials (Cloud Name, API Key, API Secret)?
4. **Android package name**: What is the real Android application ID (not `com.example.ecommerce_app`)?
5. **iOS bundle ID**: What is the real iOS bundle identifier?
6. **Twilio**: Do you want to keep SMS (requires Twilio) or stay with console-only OTP for now?
7. **OpenAI**: Is the `/ai/search` route actually used? Can it be removed?
8. **Polling tolerance**: What is the acceptable maximum delay for ride updates? (5s? 10s?)
9. **Admin fixed emails**: Current list has `youssef@gmail.com`, `youssef1@gmail.com` — are these the actual admin emails?
10. **Build**: Do you want CI/CD to auto-deploy to Vercel, or manual deployment?

---

> **End of Audit. Do not implement anything until missing credentials are provided and Task 1 of the migration roadmap is explicitly approved.**
