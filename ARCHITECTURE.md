# Weret (ReachNative Car) — Architecture

> **Last updated:** 2026-06-27  
> **Budget:** $0/mo (all services on free tier)

---

## Deployment Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               Vercel Hobby                                       │
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                       Express API (serverless functions)                  │    │
│  │  ┌─────────── routes/ ────────────┐  ┌──────── middleware/ ──────────┐   │    │
│  │  │  auth.js       (V3 — email OTP) │  │  auth.js                      │   │    │
│  │  │  rides.js      (full lifecycle) │  │  rateLimiters.js              │   │    │
│  │  │  driver.js     (dashboard/stats)│  │  errorHandler.js              │   │    │
│  │  │  driverApplication.js (onboard) │  │  validate.js                  │   │    │
│  │  │  passenger.js  (profile/stats)  │  │  validateRequest.js           │   │    │
│  │  │  safety.js     (NEW — 7 eps)    │  │  docId.js                     │   │    │
│  │  │  admin.js      (stats/users)    │  │  driverGate.js                │   │    │
│  │  │  upload.js     (Cloudinary)     │  │  fixedAdmin.js                │   │    │
│  │  │  wallet.js     (CRUD + ledger)  │  │  requestLogger.js             │   │    │
│  │  │  vehicles.js   (CRUD)           │  └───────────────────────────────┘   │    │
│  │  │  reports.js    (moderation)     │                                        │    │
│  │  │  roleSwitch.js (passenger↔driver)│  ┌───────── models/ ───────────┐    │    │
│  │  └─────────────────────────────────┘  │  User.js, Ride.js             │    │    │
│  │                                       │  Booking.js, Message.js       │    │    │
│  │  ┌────────── services/ ──────────┐   │  Transaction.js               │    │    │
│  │  │  driverDashboard.js            │   │  WalletAccount.js             │    │    │
│  │  │  driverRating.js               │   │  WithdrawalRequest.js         │    │    │
│  │  │  driverRideCapacity.js         │   │  DriverProfile.js             │    │    │
│  │  │  driverVerification.js         │   │  DriverDocuments.js           │    │    │
│  │  │  ensureFixedAdmins.js          │   │  Vehicle.js                   │    │    │
│  │  │  passengerStats.js             │   │  Report.js                    │    │    │
│  │  │  walletLedger.js               │   │  AdminAccount.js              │    │    │
│  │  │  uploadStorage.js              │   │  AdminAuditLog.js             │    │    │
│  │  └─────────────────────────────────┘   │  EmailLoginOtp.js            │    │    │
│  │                                       │  EmailPasswordResetOtp.js     │    │    │
│  │  ┌───────── mongo/ ────────────┐     │  FcmToken.js                  │    │    │
│  │  │  client.js  (connection)     │     │  SafetyEvent.js  (NEW)        │    │    │
│  │  │  odm.js     (custom ODM)     │     │  Notification.js              │    │    │
│  │  │  schema.js  (indexes)        │     │  PassengerProfile.js          │    │    │
│  │  └───────────────────────────────┘     └──────────────────────────────┘    │    │
│  │                                       ┌───── utils/ ──────┐              │    │
│  │                                       │  cache.js (Map)   │              │    │
│  │                                       │  errors, helpers   │             │    │
│  │                                       └────────────────────┘             │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬─────────────────────────────────────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  ▼                  ▼                  ▼
┌──────────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   MongoDB Atlas M0   │ │  Cloudinary  │ │  Firebase FCM    │
│   (512MB free)       │ │  (Free 25GB) │ │  (Push only)     │
│                      │ │              │ │                  │
│ Collections:         │ │ Signed URLs  │ │ Topics:          │
│  - users             │ │ with expiry  │ │  - driver_{id}   │
│  - rides             │ │ WebP auto    │ │  - user_{id}     │
│  - drivers           │ │ Client       │ │  - admin_alerts   │
│  - email_login_otps  │ │ upload       │ └──────────────────┘
│  - email_pw_reset_otps│ └──────────────┘
│  - transactions      │
│  - wallet_accounts   │
│  - withdrawal_req    │
│  - driver_documents  │
│  - driver_profiles   │
│  - passenger_profiles│
│  - vehicles          │
│  - messages          │
│  - bookings          │
│  - reports           │
│  - safety_events     │  (NEW)
│  - fcm_tokens        │
│  - notifications     │
│  - admin_accounts    │
│  - admin_audit_logs  │
│  - refresh_tokens    │
│                      │
│ Indexes:             │
│  - email_login_otps  │
│    {email:1}         │
│  - rides {status:1,  │
│    passengerId:1,    │
│    driverId:1}       │
│  - safety_events     │
│    {userId:1,        │
│     status:1}        │
│  - users {email:1}   │
└──────────────────────┘
```

---

## Flutter App Structure

```
lib/
├── main.dart                          # App entry, providers + EasyLocalization
├── app.dart                           # MaterialApp.router (GoRouter)
│
├── core/
│   ├── api/
│   │   ├── client.dart                # HTTP client helper
│   │   ├── api_client.dart            # Dio-based API client
│   │   ├── api_endpoints.dart         # All endpoint URL constants
│   │   └── auth_interceptor.dart      # JWT injection + 401 handling
│   ├── constants/                     # Enums, vehicle types
│   ├── hooks/                         # Custom Riverpod hooks
│   ├── providers/
│   │   ├── auth_provider.dart         # Auth state + login/logout/signup
│   │   ├── ride_provider.dart         # Ride lifecycle + nearby drivers
│   │   ├── driver_provider.dart       # Driver dashboard + earnings
│   │   ├── admin_provider.dart        # Admin stats
│   │   ├── wallet_provider.dart       # Wallet CRUD
│   │   └── ui_provider.dart           # Theme mode
│   ├── router/
│   │   ├── app_router.dart            # Top-level GoRouter config
│   │   ├── passenger_shell.dart       # Tab shell for passenger
│   │   ├── driver_shell.dart          # Tab shell for driver
│   │   ├── admin_shell.dart           # Tab shell for admin
│   │   ├── *tab_navigator.dart        # Web-style nested navigators
│   │   └── use_*_tab_screen_options.dart
│   ├── services/
│   │   └── upload_service.dart        # Cloudinary proxy via backend
│   ├── theme/                         # WeretTokens design system
│   ├── sync/                          # Offline sync (stub)
│   └── utils/                         # Helpers, geo, map, alerts, etc.
│
├── features/
│   ├── auth/
│   │   ├── login_screen.dart          # Email OTP + Google sign-in (no phone)
│   │   ├── passenger_register_screen.dart
│   │   ├── driver_onboarding_screen.dart
│   │   ├── register_choice_screen.dart
│   │   ├── passenger_home_screen.dart  # Map + ride request + SOS FAB
│   │   ├── driver_home_screen.dart     # Driver map + SOS FAB
│   │   ├── settings_screen.dart        # Theme/lang/account + Safety section
│   │   ├── passenger_history_screen.dart
│   │   └── admin_*.dart                # Admin screens
│   ├── driver/                         # Driver-specific screens (history, etc.)
│   ├── wallet/                         # Wallet screens (overview, deposit, etc.)
│   ├── more/                           # Passenger More menu, info screens
│   ├── safety/                         # (NEW) 7 safety screens
│   │   ├── safety_hub_screen.dart      # Hub menu for all safety features
│   │   ├── emergency_sos_screen.dart   # SOS alert + countdown
│   │   ├── trusted_contacts_screen.dart
│   │   ├── share_live_trip_screen.dart
│   │   ├── verify_driver_screen.dart
│   │   ├── report_incident_screen.dart
│   │   ├── block_user_screen.dart
│   │   ├── emergency_hotline_screen.dart
│   │   └── safety_provider.dart        # Safety service + API calls
│   ├── debug/                          # Debug log screen
│   └── ...
│
├── shared/
│   ├── models/                         # Shared data models
│   └── widgets/                        # 50+ reusable widgets
│       ├── active_ride_panel.dart       # Ride panel + verify/share/report + cancel
│       ├── cancel_ride_dialog.dart      # Cancel ride with reason picker
│       ├── fare_breakdown.dart          # Fare breakdown card
│       ├── report_user_modal.dart       # Report driver modal
│       ├── weret_ride_map.dart          # Map widget
│       └── ...
│
└── l10n/
    ├── en.json                         # ~540 English keys
    └── ar.json                         # ~540 Arabic keys
```

---

## Route Map

### Backend API Routes (Express)

| Mount Point             | File            | Auth Required | Description |
|-------------------------|-----------------|:---:|---|
| `POST /api/auth/send-otp` | `auth.js` | No | Send email OTP (V3) |
| `POST /api/auth/verify-otp` | `auth.js` | No | Verify email OTP + issue JWT |
| `POST /api/auth/google` | `auth.js` | No | Google OAuth token exchange |
| `POST /api/auth/refresh` | `auth.js` | No | Refresh JWT |
| `POST /api/auth/logout` | `auth.js` | Yes | Invalidate refresh token |
| `GET /api/auth/me` | `auth.js` | Yes | Current user profile |
| `PUT /api/auth/me` | `auth.js` | Yes | Update profile |
| `POST /api/auth/switch-role` | `roleSwitch.js` | Yes | Passenger ↔ Driver |
| `POST /api/auth/update-phone` | `auth.js` | Yes | Save contact phone |
| `POST /api/auth/send-reset-otp` | `auth.js` | No | Password reset email OTP |
| `POST /api/auth/reset-password` | `auth.js` | No | Reset password |
| `GET /api/auth/google-config` | `auth.js` | No | Google OAuth client IDs |
| `POST /api/rides` | `rides.js` | Yes | Create ride request |
| `GET /api/rides/nearby` | `rides.js` | Yes | Nearby drivers |
| `GET /api/rides/history` | `rides.js` | Yes | Ride history |
| `GET /api/rides/active` | `rides.js` | Yes | Active ride for user |
| `POST /api/rides/:id/accept` | `rides.js` | Yes | Driver accepts |
| `POST /api/rides/:id/respond` | `rides.js` | Yes | Passenger responds to proposal |
| `POST /api/rides/:id/cancel` | `rides.js` | Yes | Cancel ride |
| `POST /api/rides/:id/rate` | `rides.js` | Yes | Rate ride |
| `GET /api/rides/driver-active` | `rides.js` | Yes | Driver's active rides |
| `POST /api/rides/status-webhook` | `rides.js` | Yes | Status update (driver) |
| `GET /api/driver/dashboard` | `driver.js` | Yes | Driver stats |
| `GET /api/driver/available` | `driver.js` | Yes | Toggle availability |
| `GET /api/passenger/stats` | `passenger.js` | Yes | Passenger stats |
| `POST /api/upload` | `upload.js` | No | Cloudinary upload proxy |
| `GET /api/wallet` | `wallet.js` | Yes | Wallet overview |
| `POST /api/wallet/deposit` | `wallet.js` | Yes | Deposit (simulated) |
| `POST /api/wallet/withdraw` | `wallet.js` | Yes | Withdraw request |
| `GET /api/wallet/history` | `wallet.js` | Yes | Transaction history |
| `POST /api/wallet/accounts` | `wallet.js` | Yes | Add payout account |
| `POST /api/safety/emergency` | `safety.js` | Yes | **NEW** Trigger SOS alert |
| `PUT /api/safety/emergency/:id/resolve` | `safety.js` | Yes | **NEW** Resolve SOS |
| `GET /api/safety/trusted-contacts` | `safety.js` | Yes | **NEW** List trusted contacts |
| `POST /api/safety/trusted-contacts` | `safety.js` | Yes | **NEW** Add contact |
| `DELETE /api/safety/trusted-contacts/:contactId` | `safety.js` | Yes | **NEW** Remove contact |
| `POST /api/safety/block/:userId` | `safety.js` | Yes | **NEW** Block user |
| `POST /api/safety/unblock/:userId` | `safety.js` | Yes | **NEW** Unblock user |
| `GET /api/safety/blocked` | `safety.js` | Yes | **NEW** Blocked list |
| `POST /api/safety/share-trip` | `safety.js` | Yes | **NEW** Share trip link |
| `POST /api/vehicles` | `vehicles.js` | Yes | Register vehicle |
| `POST /api/driver-application` | `driverApplication.js` | Yes | Driver onboarding |
| `POST /api/reports` | `reports.js` | Yes | Report user/incident |
| `GET /api/admin/stats` | `admin.js` | Admin | Admin dashboard stats |
| `GET /api/admin/users` | `admin.js` | Admin | User management |
| `GET /api/admin/rides` | `admin.js` | Admin | All rides |
| `GET /api/admin/reports` | `admin.js` | Admin | All reports |

### Flutter Route Tree (GoRouter)

```
/                              ──→ AuthGate (login or home)
/login                         ──→ LoginScreen
/register/choice               ──→ RegisterChoiceScreen
/register/passenger            ──→ PassengerRegisterScreen
/register/driver               ──→ DriverOnboardingScreen
/ride-detail/:rideId           ──→ DriverRequestDetailScreen
/ride-chat/:rideId             ──→ RideChatScreen
/in-app-call/:rideId           ──→ InAppCallScreen
/debug/log                     ──→ DebugLogScreen

/safety/emergency              ──→ EmergencySosScreen         NEW
/safety/trusted-contacts       ──→ TrustedContactsScreen      NEW
/safety/share-trip             ──→ ShareLiveTripScreen        NEW
/safety/verify-driver          ──→ VerifyDriverScreen         NEW
/safety/report                 ──→ ReportIncidentScreen       NEW
/safety/blocked                ──→ BlockUserScreen            NEW
/safety/hotline                ──→ EmergencyHotlineScreen     NEW

[Passenger Shell — 4 tabs]
  /passenger/home              ──→ PassengerHomeScreen (+ SOS FAB during ride)
  /passenger/history           ──→ PassengerHistoryScreen
  /passenger/more              ──→ PassengerMoreMenuScreen
    /passenger/more/wallet     ──→ WalletOverviewScreen ⋯
    /passenger/more/safety     ──→ SafetyHubScreen             NEW
    /passenger/more/...
  /passenger/settings          ──→ SettingsScreen (+ Safety section)  NEW

[Driver Shell — 4 tabs]
  /driver/home                 ──→ DriverHomeScreen (+ SOS FAB during ride)
  /driver/more                 ──→ DriverMoreMenuScreen
  /driver/settings             ──→ SettingsScreen

[Admin Shell — 4 tabs]
  /admin/home                  ──→ AdminDashboardScreen
  /admin/users                 ──→ AdminUsersScreen
  /admin/reports               ──→ AdminReportsScreen
```

---

## Authentication Flow (V3 — Email OTP Only)

> **Phone OTP removed.** Only email OTP + Google sign-in are used.

```
Mobile App
  │
  ├── Email path:
  │     POST /api/auth/send-otp {email}
  │       → MongoDB create(EmailLoginOtp) → nodemailer (Gmail SMTP)
  │         → dev fallback: console.log(code)
  │     POST /api/auth/verify-otp {email, code}
  │       → MongoDB findOne + delete → JWT (60d)
  │
  └── Google path:
        POST /api/auth/google {idToken}
          → Backend verifies via Google API → findOrCreate user → JWT (60d)

All authenticated requests:
  Authorization: Bearer <JWT>
    → authMiddleware → JWT.verify() → req.user
    → blockCheck → roleRequired (per-route)
```

---

## Data Flow — Ride Lifecycle

```
1. Passenger sets pickup + destination on map
2. POST /api/rides  →  find nearby drivers (in-memory distance sort)
3. Driver polls GET /api/rides/driver-active  (3s intervals)
4. Driver accepts → POST /api/rides/:id/accept
5. Passenger sees driver on map via polling GET /api/rides/active
6. Status transitions: pending → accepted → driver_arriving
   → passenger_onboard → in_progress → completed
7. POST /api/rides/:id/rate  (both sides)
```

---

## Safety Module Data Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   SOS Alert      │     │ Trusted Contacts │     │  Block User      │
│                  │     │                  │     │                  │
│ POST /emergency  │     │ GET /trusted-    │     │ POST /block/:id  │
│ → creates        │     │   contacts       │     │ → adds to        │
│   SafetyEvent    │     │ POST /trusted-   │     │   user.blocked   │
│ + notifies       │     │   contacts       │     │   array           │
│   SMS contacts   │     │ DELETE /trusted- │     │ POST /unblock/:id│
│                  │     │   contacts/:id   │     │ GET /blocked     │
│ PUT /emergency   │     │                  │     │                  │
│   /:id/resolve   │     │ Contacts stored  │     │ Blocked list     │
│                  │     │ in user document │     │ from user doc    │
└──────────────────┘     └──────────────────┘     └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│  Share Trip      │     │  Report Incident │
│                  │     │                  │
│ POST /share-trip │     │ POST /reports    │
│ → SMS link to    │     │ → creates Report │
│   trusted contact│     │   doc            │
│   (simulated)    │     │                  │
│                  │     │ Attachments      │
│ Ride details     │     │ (photo/video)    │
│ encoded in link  │     │ via Cloudinary   │
└──────────────────┘     └──────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Free Tier | Status |
|-------|-----------|---------|-----------|--------|
| Hosting | Vercel Hobby | N/A | ✅ Free | Deployed |
| Runtime | Node.js | 22.20.0 | ✅ Free | Working |
| Framework | Express | 4.x | ✅ Free | Working |
| Database | MongoDB Atlas M0 | 7.x | ✅ Free (512MB) | Connected |
| Driver | mongodb (native) | 6.x | ✅ Free | Working |
| ODM | Custom (`mongo/odm.js`) | N/A | ✅ Free | Working |
| Auth | JWT (jsonwebtoken) + bcrypt | 9.x | ✅ Free | Working |
| Push | Firebase Admin SDK | 11.x | ✅ Free | Configured |
| Email | Nodemailer (Gmail SMTP) | Latest | ✅ Free | Working |
| Upload | Cloudinary (signed proxy) | N/A | ✅ Free (25GB) | Working |
| Mobile app | Flutter | 3.44.2 | ✅ Free | Builds |
| Admin web | Vanilla JS + Chart.js | Latest | ✅ Free | Static files |
| Real-time | REST polling (3-5s) | N/A | ✅ Free | Replaces Socket.io |

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Email OTP replaces phone OTP** | Firebase phone auth requires billing + SHA-1. Email OTP is zero-cost, works offline, no Firebase dependency. |
| **Custom ODM (not Mongoose)** | Mongoose adds bloat for a simple CRUD app. Custom ODM keeps bundle small and cold-start fast. |
| **In-memory Map cache (no Redis)** | Redis requires a paid addon; per-instance Map is free and sufficient for <100 concurrent users. |
| **No Socket.io (REST polling)** | Vercel Hobby has no WebSocket support; polling is the only free option on serverless. |
| **Safety events stored in MongoDB** | No real-time alerting needed — SOS creates a persisted event for review. Trusted contacts and blocked users are embedded in the User document. |
| **Client-upload to Cloudinary** (via backend proxy) | Avoids 10s Vercel timeout and ephemeral /tmp storage; backend signs the upload but data goes direct to Cloudinary. |
| **Embedded arrays for contacts/blocks** | Trusted contacts and blocked users are small (<50 entries per user), so embedding avoids JOINs/separate collections. |
| **Seperate SafetyEvent collection** | SOS alerts need indexing by status + timestamp for admin review — a separate collection is cleaner than embedding. |

---

## System Boundaries

### In Scope (Free-Tier Viable)
- Ride CRUD lifecycle
- Email OTP auth + Google sign-in
- REST polling for ride status, driver location, chat
- In-memory Map cache
- FCM push notifications (topic-based)
- Image upload via Cloudinary (backend proxied)
- Chat during rides (polling-based)
- Admin dashboard with aggregated stats
- Rate limiting (in-function)
- CORS whitelist
- **Safety module** (SOS, Trusted Contacts, Block, Share Trip, Verify Driver, Report, Hotlines)

### Out of Scope (Requires Paid Services)
- Real-time WebSocket communication
- Redis or external cache
- Cron jobs (Vercel Hobby limitation)
- Geo-spatial queries via $geoNear (M0 limitation)
- Phone SMS auth (Twilio or Firebase)
- Staging/production separation
- CI/CD pipeline
- iOS builds (no Mac builder)
- Automated backup/restore
