# WERET — Full-Stack Ride-Hailing Platform Analysis

## Overview

**WERET** is a production-grade ride-hailing platform (like Uber/Careem) with a Flutter mobile app (iOS/Android/Windows), an Express REST API backend, a real-time Socket.io layer, and a vanilla JS admin web panel. It supports passenger, driver, and admin roles with ride lifecycle management, wallet/payments, real-time tracking, AI-powered features, and full localization (English/Arabic).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Flutter Mobile App                      │
│  (apps/mobile-flutter/lib)                                   │
│  Riverpod state · GoRouter routing · Dio HTTP · Socket.io   │
│  160+ files · 3 role shells · 45+ routes · 46+ widgets      │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                  shared/ (Contract Layer)                     │
│  constants/ (vehicleTypes, walletTypes, fixedAdminEmails)     │
│  models/ (user.model.json - Dart model)                      │
│  services/ (apiEndpoints.js - canonical endpoint list)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Express Backend (backend/src/)                   │
│  Custom ODM on raw mongodb driver · JWT auth · Socket.io     │
│  11 route files · 19 MongoDB models · 9 services · 1 job    │
│  ~60+ API endpoints · 3 auth methods                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Admin Web Panel (apps/web/)                      │
│  Vanilla HTML/JS SPA · served at /admin-ui/                  │
│  Dashboard, Users, Rides, Reports, Transactions, Audit       │
│  Full Arabic/English i18n · 1,562 lines app.js               │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Flutter Mobile App (`apps/mobile-flutter/`)

### Stack
| Library | Purpose |
|---------|---------|
| Flutter 3.5+ | Framework (Material 3) |
| flutter_riverpod | State management (6 state notifiers) |
| go_router | Routing with auth guards |
| dio | HTTP client with auto-auth headers |
| socket_io_client | Real-time ride updates |
| flutter_map + latlong2 | OpenStreetMap map rendering |
| geolocator | Device GPS |
| google_sign_in | Google OAuth |
| easy_localization | i18n (EN/AR, 845+ keys each) |
| image_picker | Photo uploads |
| equatable | Value equality |

### State Management (6 Riverpod Providers)

| Provider | State | Key Methods |
|----------|-------|-------------|
| `authProvider` | AuthState | login, register, googleSignIn, phoneOtp, forgotPassword, logout, session hydration |
| `rideProvider` | RideState | createRide, acceptRide, startRide, endRide, cancelRide, rateDriver, nearbyDrivers, chat messages |
| `driverProvider` | DriverState | toggleOnline, addCar, updateCar, deleteCar, locationUpdate, earnings, dashboard |
| `walletProvider` | WalletState | accounts, deposit, withdraw, transactions, Firestore sync |
| `adminProvider` | AdminState | paginated users/rides/reports/transactions/audit, moderate actions |
| `themeModeProvider` | ThemeMode | light/dark/system persistence |

### Routing (GoRouter)

**3 role shells** with bottom navigation tabs:

| Role | Tabs |
|------|------|
| **Passenger** | Home (map + booking), History, More (wallet, tips, saved places, help, settings), Settings |
| **Driver** | Requests (available rides), Earnings, Profile (cars, wallet, settings) |
| **Admin** | Dashboard, Users, Rides, More (tools, reports, transactions, audit), Settings |

Auth redirect logic in `appRouterProvider`: not-hydrated→wait, unauthenticated→`/login`, authenticated→role-appropriate home, passenger-on-driver-route→redirect, driver-on-passenger-route→redirect.

### Key Screens

**Passenger flow:** Onboarding → Login/Register (email, phone OTP, Google) → Home (map, place search, vehicle picker, ride request) → Ride tracking (chat, call) → Rating.

**Driver flow:** Register → Onboarding (docs, license, vehicle info) → Verification → Online/offline toggle → Ride offers → Accept/negotiate → Navigate → Complete → Earnings.

**Admin flow:** Login → Dashboard (KPIs, charts, activity feed) → Users CRUD → Rides view → Reports moderation → Transactions flagging → Audit log.

### Features

- **Real-time ride tracking** via Socket.io (driver location, ride status changes)
- **Ride pooling** (multiple passengers sharing a ride)
- **Parcel/shipping** mode
- **Vehicle types**: shipping, delivery, travel, motorcycle, car_standard, car_comfort
- **Wallet system**: multi-account (cash, InstaPay, Vodafone Cash, Etisalat, Orange, WePay), deposit/withdraw, OTP-protected withdrawals
- **AI features**: fare suggestion (OpenAI), place autocomplete reranking (OpenAI)
- **In-app chat & WebRTC voice calls** during rides
- **Dark/light theme** with Material 3
- **Bilingual** (English, Arabic) with full RTL support

---

## 2. Express Backend (`backend/src/`)

### Stack
| Library | Purpose |
|---------|---------|
| express | HTTP server |
| mongodb (native driver) | Database (custom ODM) |
| jsonwebtoken | JWT auth (7-day expiry) |
| bcryptjs | Password hashing |
| socket.io | Real-time WebSocket events |
| google-auth-library | Google ID token verification |
| helmet | Security headers |
| cors | Cross-origin requests |
| express-rate-limit | Rate limiting |
| express-validator | Input validation |
| multer | File uploads (local disk) |
| undici | HTTP client |
| mongodb-memory-server | In-memory MongoDB for testing |

### API Endpoints (60+)

**Auth** (`/auth`): google-config, google sign-in, register, login, phone OTP (send/verify), forgot-password, reset-password, me, profile update, verify-password

**Rides** (`/rides`): create, pool-matches, join, nearby-drivers, route-preview, available (for drivers), accept/offer, respond-proposal, withdraw-offer, driver-confirm-booking, driver-cancel, start, end, cancel, rate, history, messages (get/post), single ride detail

**Driver** (`/driver`): status, dashboard, earnings-summary, toggle-status, cars CRUD, location-update

**Passenger** (`/passenger`): location-update

**Wallet** (`/wallet`): accounts CRUD, deposit, withdraw (request + confirm with OTP), transactions history

**Admin** (`/admin`): users (list, update, delete), rides (list), reports (list, update), transactions (list, flag), audit log, stats

**Other**: vehicles, reports (submit), upload, driver-application (submit, get), role-switch, AI search (fare suggest, places rerank), health

### MongoDB Models (19 collections)

`users`, `rides`, `bookings`, `vehicles`, `driverProfiles`, `driverDocuments`, `passengerProfiles`, `adminAccounts`, `adminAuditLogs`, `walletAccounts`, `transactions`, `withdrawalRequests`, `messages`, `phoneLoginOtps`, `emailPasswordResetOtps`, `reports`

**Custom ODM** (`mongo/odm.js`): built on raw `mongodb` driver with query chaining, camelCase↔snake_case field mapping, in-memory populate, Date conversion, aggregation helpers.

### Authentication Methods
1. **Email/Password** — bcrypt hashing, JWT token
2. **Google Sign-In** — ID token verification via `google-auth-library`
3. **Phone OTP** — 6-digit OTP, SHA-256 digest, Twilio SMS

### Authorization Layers
- `authRequired` — JWT verification
- `blockCheck` — checks `is_blocked` / `blocked_until`
- `roleRequired(...roles)` — role gating (passenger/driver/admin)
- `fixedAdminOnly` — only `youssef@gmail.com` and `youssef1@gmail.com`
- `requireApprovedDriver` — driver must be approved with active car

### Real-time Events (Socket.io)

**Rooms:** `user:<userId>`, `ride:<rideId>`, `drivers:<vehicleType>`

**Server→Client:** `ride:update` (status changes), `ride:message`, `driver:location`, `webrtc:signal`

**Client→Server:** `subscribeRide`, `unsubscribeRide`, `subscribeDriverFeed`, `webrtc:join/leave/signal`, `ride:typing`

### Services
- `ensureFixedAdmins` — hardcoded admin accounts on startup
- `walletLedger` — credit driver on ride completion
- `driverRating` — aggregate ratings from completed rides
- `driverRideCapacity` — max 2 concurrent rides per driver
- `driverDashboard` — aggregator for driver home data
- `driverVerification` — onboarding progress computation
- `passengerStats` — completed ride count
- `sendSms` — Twilio SMS (console fallback in dev)
- `uploadStorage` — always local disk

### Jobs
- `simulateMovement` — moves online drivers toward destinations (for demo/testing), enabled via `SIMULATION_ENABLED=1`

### Database Connection (fallback chain)
1. `MONGODB_URI` = "memory" or `MONGODB_USE_MEMORY=1` → mongodb-memory-server
2. Atlas URI → fallback to local → memory
3. `MONGODB_LOCAL_URI` → fallback to memory

### Seed Data
- **6 vehicle tiers** (shipping → car_comfort)
- **6 mock drivers** (one per vehicle type, password `driver123`, all approved + online)
- **2 demo passengers** (password `demo123`, wallets with 500 balance)

---

## 3. Admin Web Panel (`apps/web/`)

### Stack
- Vanilla HTML, CSS, JS (no frameworks)
- Served at `/admin-ui/` from Express
- 1,562 lines `app.js`, 1,904 lines `styles.css`

### Sections (SPA)
| Section | Features |
|---------|----------|
| **Dashboard** | Hero KPI grid (4 cards), secondary KPIs (7 cards), ride status bar chart, quick actions, activity feed, DB status |
| **Users** | Paginated table, search, verify/block/unblock/approve-reject driver/delete actions with typed confirmations |
| **Rides** | Read-only table (status, passenger, driver, fare, rating, review, date) |
| **Reports** | Table with inline status dropdown (open/reviewing/resolved/dismissed) |
| **Transactions** | Table with flag/unflag actions, flagged row highlighting |
| **Audit Log** | Read-only table (time, action, admin, target, summary) |

### UX Features
- Full Arabic/English i18n with RTL/LTR switching
- Skeleton loading shimmer
- Pagination on all 5 data tables
- Debounced global search (320ms)
- Toast notifications (success/error/info)
- Confirmation modal for destructive actions (typed "BLOCK" / "DELETE")
- Animated SVG logo with car animation
- Responsive layout (sidebar collapses to top nav at 960px)
- `prefers-reduced-motion` support

---

## 4. Shared Contract Layer (`shared/`)

| File | Purpose |
|------|---------|
| `constants/walletTypes.js` | `["cash","instapay","vodafone","etisalat","orange","wepay"]` |
| `constants/vehicleTypes.js` | 6 vehicle type keys + car-only filter |
| `constants/fixedAdminEmails.js` | `["youssef@gmail.com","youssef1@gmail.com"]` |
| `models/user.model.json` | Canonical WeretUser Dart model (camelCase+snake_case) |
| `services/apiEndpoints.js` | All 60+ API endpoints + 11 socket events (canonical contract) |

---

## 5. Infra & DevOps

| Aspect | Details |
|--------|---------|
| **Monorepo** | npm workspaces, `concurrently` for parallel dev |
| **Docker** | `docker-compose.yml` |
| **Vercel** | `backend/vercel.json`, `VERCEL.md` |
| **Firebase** | `firebase.json`, `firebase-service-account.json`, `docs/FIREBASE_SETUP.md` |
| **APK builds** | GitHub Actions (see `BUILD_APK.md`) |
| **GitHub CI** | `.github/` workflows |
| **VS Code** | `.vscode/`, `weret.code-workspace` |

---

## 6. Filesystem

```
D:\Games\ReachNative Car\
├── apps/
│   ├── mobile-flutter/    ← Flutter app (160+ lib files, Dart)
│   └── web/               ← Admin panel (HTML/JS/CSS)
├── backend/
│   ├── src/               ← Express backend
│   │   ├── config/        ← DB, env, Firebase config
│   │   ├── middleware/     ← Auth, validation, rate limiting
│   │   ├── models/        ← 19 MongoDB collections (custom ODM)
│   │   ├── routes/        ← 11 route files (auth, rides, driver, etc.)
│   │   ├── services/      ← Business logic (9 services)
│   │   ├── realtime/      ← Socket.io setup + helpers
│   │   ├── jobs/          ← Driver simulation
│   │   ├── seed/          ← Vehicle + demo data seeding
│   │   ├── mongo/         ← Custom ODM, client, field mapping
│   │   └── utils/         ← Token signing, helpers
│   ├── test/              ← Backend tests (Node --test)
│   └── scripts/           ← Smoke tests, Mongo init scripts
├── shared/                ← Contracts (constants, models, API endpoints)
├── assets/                ← Branding, icons, splash screens
├── scripts/               ← Flutter init, brand gen, workspace sync
├── docs/                  ← Migration reports, architecture docs
└── dcs/                   ← Consolidated markdown documentation
```

---

## 7. Key Business Flows

### Ride Lifecycle
1. Passenger requests ride (pickup→destination, vehicle type, fare)
2. Drivers in area receive notification via `drivers:<vehicleType>` room
3. Driver submits price offer (or accepts preassigned)
4. Passenger accepts/rejects offer
5. Driver confirms booking → ride is `accepted`
6. Driver starts ride → `ongoing` (real-time tracking begins)
7. Driver ends ride → `completed` (wallet credited for driver, chat/call ends)
8. Passenger rates driver (1-5)

### Wallet Flows
- **Deposit**: passenger/driver selects wallet account → "deposit" endpoint credits balance → Transaction created
- **Withdraw**: request OTP → verify OTP → balance debited
- **Ride payment**: on completion, driver's cash wallet is credited automatically

### Admin Moderation
- Approve/reject driver applications (with review notes)
- Verify user identities
- Block/unblock users (temporary with `blocked_until`)
- Moderate reports (open → reviewing → resolved/dismissed)
- Flag suspicious transactions
- View audit log of all admin actions
