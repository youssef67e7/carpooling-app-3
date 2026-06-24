# Current Architecture (As-Is)

> **Audit date:** 2026-06-24  
> **Budget:** $0/mo (all services on free tier)

---

## Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Vercel Hobby (not deployed)                     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Express App (createApp.js)                    │    │
│  │                                                                   │    │
│  │  ┌──────── routes/ ─────────┐  ┌────── middleware/ ─────────┐    │    │
│  │  │  admin.js                │  │  auth.js                   │    │    │
│  │  │  aiSearch.js             │  │  docId.js                  │    │    │
│  │  │  auth.js                 │  │  driverGate.js             │    │    │
│  │  │  driver.js               │  │  errorHandler.js           │    │    │
│  │  │  driverApplication.js    │  │  fixedAdmin.js             │    │    │
│  │  │  passenger.js            │  │  rateLimiters.js           │    │    │
│  │  │  reports.js              │  │  validateRequest.js        │    │    │
│  │  │  rides.js                │  └────────────────────────────┘    │    │
│  │  │  roleSwitch.js           │                                      │    │
│  │  │  uploads.js              │  ┌────── services/ ─────────┐    │    │
│  │  │  vehicles.js             │  │  driverDashboard.js       │    │    │
│  │  │  wallet.js               │  │  driverRating.js          │    │    │
│  │  └──────────────────────────┘  │  driverRideCapacity.js    │    │    │
│  │                                │  driverVerification.js    │    │    │
│  │  ┌────── models/ (ODM) ────┐  │  ensureFixedAdmins.js     │    │    │
│  │  │  AdminAccount.js         │  │  passengerStats.js        │    │    │
│  │  │  AdminAuditLog.js        │  │  sendSms.js               │    │    │
│  │  │  Booking.js              │  │  uploadStorage.js         │    │    │
│  │  │  DriverDocuments.js      │  │  walletLedger.js          │    │    │
│  │  │  DriverProfile.js        │  └────────────────────────────┘    │    │
│  │  │  EmailPasswordResetOtp.js│                                      │    │
│  │  │  Message.js              │  ┌────── mongo/ ────────────┐    │    │
│  │  │  PassengerProfile.js     │  │  odm.js (custom ODM)     │    │    │
│  │  │  PhoneLoginOtp.js        │  │  client.js (connection)  │    │    │
│  │  │  Report.js               │  │  schema.js               │    │    │
│  │  │  Ride.js                 │  └────────────────────────────┘    │    │
│  │  │  Transaction.js          │                                      │    │
│  │  │  User.js                 │  ┌────── utils/ ────────────┐    │    │
│  │  │  Vehicle.js              │  │  cache.js (empty stub)   │    │    │
│  │  │  WalletAccount.js        │  │  errors, helpers         │    │    │
│  │  │  WithdrawalRequest.js    │  └────────────────────────────┘    │    │
│  │  └──────────────────────────┘                                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          MongoDB Atlas M0 (not deployed)                 │
│                                                                         │
│  Collections (auto-created by ODM on first write):                      │
│  - users, drivers, rides, bookings, messages                            │
│  - phone_login_otps, email_password_reset_otps                          │
│  - passenger_profiles, driver_profiles, driver_documents                │
│  - admin_accounts, admin_audit_logs                                     │
│  - transactions, wallet_accounts, withdrawal_requests                   │
│  - vehicles, reports                                                    │
│                                                                         │
│  No indexes created explicitly (relying on ODM defaults)                │
│  No TTL indexes — OTPs and audit logs live forever                      │
│  No 2dsphere index — geo queries done in-memory                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow — Ride Lifecycle

```
User Request ──► POST /api/rides ──► ODM.find(available drivers)
                     │
                     ▼
                  ODM reads ALL drivers into RAM → JS .filter(distance)
                     │
                     ▼
                  No real-time notification (Socket.io unused on Vercel)
                     │
                     ▼
                  Driver must poll manually or miss the request
                     │
                     ▼
                  Driver accepts via POST /api/rides/accept
                     │
                     ▼
                  ODM.update(ride.status) sequentially through lifecycle:
                  accepted → arrived → in_progress → completed
                     │
                     ▼
                  Payment → ODM.create(transaction)
                  Review  → ODM.create(review)
```

## Authentication Flow

```
Mobile App ──► POST /api/auth/send-otp
                   │
                   ▼
               ODM.create(otp) + Console SMS (no Twilio — SMS_CONSOLE_MODE=1)
                   │
                   ▼
               POST /api/auth/verify-otp
                   │
                   ▼
               ODM.findOne(otp) → verify code (no TTL — OTP persists forever)
                   │
                   ▼
               JWT issued (60d expiry, no refresh tokens)
                   │
                   ▼
               authMiddleware — Bearer → JWT.verify() → req.user
```

## Data Flow — Admin Panel

```
Admin Web Page ──► GET /api/admin/stats
                       │
                       ▼
                    ODM sequential queries (no aggregation pipeline):
                    - User counts, driver counts, ride stats
                    - Revenue (computed in JS from loaded docs)
                    - All queries load full collections into RAM
                       │
                       ▼
                    JSON response → Chart.js render (client-side)
                    Response time: ~4s (loads all data in memory)
```

## Real-time Communication

```
Socket.io — listed in package.json but NOT imported in createApp.js
            No socket handler files found in src/

┌─────────────────────────────────────────────────────────────────┐
│  Socket.io is a dead dependency. Not wired in the Express app.  │
│  Flutter pubspec.yaml lists socket_io_client: ^3.0.2 but the   │
│  backend never sets up Socket.io — zero real-time capability.   │
└─────────────────────────────────────────────────────────────────┘

No REST polling fallback exists. The app has no real-time
communication in any form.
```

## Technology Stack (Current)

| Layer | Technology | Version | Free Tier | Status |
|-------|-----------|---------|-----------|--------|
| Hosting | Vercel Hobby | N/A | ✅ Free | Not yet deployed |
| Runtime | Node.js | 22.20.0 | ✅ Free | Installed |
| Framework | Express | 4.x | ✅ Free | Working |
| Database | MongoDB Atlas M0 | 7.x | ✅ Free (512MB) | Not yet deployed |
| ODM | Custom (`mongo/odm.js`) | N/A | ✅ Free | Working but broken (in-memory) |
| Driver | mongodb (native) | 6.x | ✅ Free | Listed but not used for queries |
| Cache | None (stub only) | N/A | ✅ Free | `utils/cache.js` is an empty stub |
| Auth | JWT (jsonwebtoken) | 9.x | ✅ Free | Working |
| Push | Firebase Admin SDK | 11.x | ✅ Free (FCM) | Not configured — service account exists but no code uses it |
| SMS | Console only | N/A | ✅ Free | `SMS_CONSOLE_MODE=1`, no Twilio |
| Upload | Multer (local disk) | Latest | ✅ Free | Files written to `backend/uploads/` |
| Image hosting | Cloudinary (env only) | N/A | ✅ Free (25GB) | Credentials saved but upload code not using it |
| Mobile app | Flutter | 3.44.2 | ✅ Free | Builds, 0 tests passing |
| Admin web | Vanilla JS + Chart.js | Latest | ✅ Free | Static files, 56KB app.js |
| Real-time | None | N/A | ✅ Free | Socket.io unplugged, no polling |

## Critical Problems

| # | Problem | Location | Impact |
|---|---------|----------|--------|
| 1 | ODM loads entire collections into RAM | `src/mongo/odm.js` — every find() reads all docs | Will crash on M0's shared vCPU at ~500 rides |
| 2 | No real-time communication | Socket.io not wired + no REST polling | App has no live updates — rides, chat, location are blind |
| 3 | Secrets in `.env` (MongoDB password, JWT, OAuth, admin passwords) | `backend/.env` — gitignored but once committed historically | Credentials exposed if repo is shared |
| 4 | Rate limiter no-op on Vercel | `src/middleware/rateLimiters.js` — in-memory counters lost per-instance | No DDoS protection |
| 5 | CORS wide open (`*`) | `src/createApp.js:44` | Any domain can call API |
| 6 | No TTL indexes | OTP collections — no createdAt index | OTPs and audit records grow unbounded |
| 7 | No geo index | `drivers` collection — no 2dsphere | All driver distance calculations in JS RAM |
| 8 | Firebase Admin SDK not initialized | `backend/src/services/` — no pushService.js | Push notifications absent |
| 9 | Cloudinary configured but unused | `backend/.env` has credentials; upload code still uses multer → local disk | Uploads lost on Vercel cold start |
| 10 | Android app ID is placeholder | `android/app/build.gradle.kts` — `applicationId = "com.example.ecommerce_app"` | Google OAuth mismatch, cannot publish |
| 11 | Flutter Google OAuth IDs empty | `apps/mobile-flutter/.env` — all GOOGLE_*_CLIENT_ID blank | Google Sign-In broken on mobile |
| 12 | No indexes on any collection | All queries do collection scans | Every request hits every document |
| 13 | Vercel not deployed | No `vercel link`, no deployment | App only runs locally with in-memory MongoDB |

## Known Dead Code

| File/Dep | Reason | Action Planned |
|----------|--------|---------------|
| `socket.io` in `package.json` | Not imported anywhere in source | Remove in Task 9 |
| `socket_io_client` in Flutter `pubspec.yaml` | Backend has no socket server | Remove in Task 9 |
| `utils/cache.js` | Empty stub, exports nothing | Implement in Task 8 |
| `src/services/` — no pushService.js | Referenced in docs but never created | Create in Task 10 |
| `firebase.json` → `firestore.rules` | File does not exist, no Firestore usage | Remove firestore block |
| `src/firestore/` directory | Empty directory | Remove |

## Account & Project IDs

| Service | ID / Name | Status |
|---------|-----------|--------|
| MongoDB Atlas | Cluster: `cluster0.bccjvvm.mongodb.net`, DB: `weret`, User: `os5027817_db_user` | Credentials saved, connection not verified |
| Firebase | Project: `youssef-f757e`, Android: `com.example.ecommerce_app` | google-services.json present, no code imports |
| Cloudinary | Cloud: `dixvj7zzs`, API Key: configured | Credentials saved, not used in code |
| Google OAuth | Project: `239031460199`, Web + Android + iOS client IDs | Backend .env populated, Flutter .env empty |
| Vercel | Not linked | No project, no deployment |
| GitHub | No remote configured | Zero commits, no repository |
