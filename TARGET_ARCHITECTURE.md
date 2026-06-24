# Target Architecture (Free-Tier)

> **Constraint:** Zero budget — graduation project. All services on free tier.

---

## Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Vercel Hobby                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Express API (serverless)                   │    │
│  │                                                               │    │
│  │  ┌──── routes/ ────┐  ┌── middleware/ ──┐  ┌── services/ ──┐│    │
│  │  │  admin.js       │  │  auth.js        │  │  otpService   ││    │
│  │  │  auth.js        │  │  rateLimiter    │  │  pushService  ││    │
│  │  │  rides.js       │  │  errorHandler   │  │  emailService ││    │
│  │  │  users.js       │  │  validate.js    │  └───────────────┘│    │
│  │  │  drivers.js     │  └─────────────────┘                     │    │
│  │  │  chat.js        │                                           │    │
│  │  │  notifications  │  ┌── mongo/ ───────┐  ┌── utils/ ────┐ │    │
│  │  │  payments.js    │  │  queries/*.js   │  │  cache.js    │ │    │
│  │  │  upload.js      │  │  db.js          │  │  helpers.js  │ │    │
│  │  │  reviews.js     │  └─────────────────┘  └──────────────┘ │    │
│  │  └─────────────────┘                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────┐
│  MongoDB Atlas M0 │ │Cloudinary│ │ Firebase FCM │
│  (512MB, free)    │ │(Free 25G)│ │ (Push only)  │
│                   │ │          │ │              │
│ Collections:      │ │Signed    │ │ Topics:      │
│  - users          │ │URLs with │ │ - driver_{id}│
│  - drivers        │ │expiry    │ │ - user_{id}  │
│  - rides          │ │WebP auto │ │ - admin_alerts│
│  - otp (TTL idx)  │ │Client    │ └──────────────┘
│  - transactions   │ │upload    │
│  - subscriptions  │ └──────────┘
│  - reviews        │
│  - audit_log (TTL)│
│  - notifications  │
│  - promo_codes    │
│  - sms_log        │
│  - saved_locations│
│  - service_areas  │
│                   │
│ Index strategy:   │
│ - TTL on otp (5m) │
│ - TTL on audit(30d)│
│ - Compound on     │
│   rides.status+ts │
│ - drivers.online  │
└──────────────────┘
```

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Replace Socket.io with REST polling | Vercel Hobby has no WebSocket support; polling is the only free option |
| Rewrite ODM to native MongoDB driver | Current ODM loads collections into RAM — impossible on M0's shared vCPU |
| In-memory Map cache (no Redis) | Redis requires a paid addon; per-instance Map is free and sufficient for <100 concurrent users |
| TTL indexes replace Cron cleanup | Vercel Hobby has no Cron Jobs; TTL indexes achieve the same at zero cost |
| No $geoNear — app-level sort instead | M0 does not support 2dsphere index with $geoNear stage; sort results in app after find |
| FCM push only (no Firestore) | Free, unlimited push; Firestore adds complexity and no benefit since all data is in MongoDB |
| Cloudinary client-upload (not through Vercel) | Avoids 10s Vercel timeout and ephemeral /tmp storage |
| No Sentry | Console logging is free; Sentry free tier exists but adds scope creep for a graduation project |
| MongoDB connection pool max 5 | M0 supports ~100 connections; 5 per Vercel instance × 3 concurrent = 15, well within limit |

## Data Flow — Ride Lifecycle

```
User request ──► POST /api/rides ──► Native find(drivers) via indexed query
                    │
                    ▼
                 App-level distance sort (no $geoNear)
                    │
                    ▼
                 Store ride → update cache → respond 201
                 Mobile polls GET /api/rides/:id/status every 3s
                    │
                    ▼
                 Driver polls GET /api/rides/requested every 3s
                 Driver accepts ──► POST /api/rides/:id/accept
                    │
                    ▼
                 Status via REST polling (3-5s intervals)
                 Chat via GET/POST /api/chat/:rideId/messages?since=
                 Location via GET/POST /api/drivers/:id/location
```

## Authentication Flow

```
Mobile App ──► POST /api/auth/send-otp
                   │
                   ▼
               MongoDB create(otp) + Console SMS
                   │
                   ▼
               POST /api/auth/verify-otp
                   │
                   ▼
               MongoDB findOne(otp) → verify → JWT (60d)
                   │
                   ▼
               authMiddleware — Bearer → JWT.verify() → req.user
```

## Real-time Communication

```
REST Polling (replaces Socket.io — no WebSocket available)
├── Ride status     → GET /api/rides/:id/status          (3s interval)
├── Chat messages   → GET /api/chat/:rideId/messages     (3s interval)
├── Driver location → GET /api/drivers/:id/location      (3s interval)
├── Notifications   → GET /api/notifications?since=<ts>  (5s interval)
└── Online drivers  → GET /api/drivers/online            (5s interval)

Write operations remain REST:
├── Chat send       → POST /api/chat/:rideId/send
├── Location update → POST /api/drivers/:id/location
├── Ride action     → POST /api/rides/:id/{accept,start,end,cancel}
└── Server-side FCM → notifyUser() via Firebase Admin SDK
```

## Technology Stack

| Layer | Technology | Version | Cost Tier | Notes |
|-------|-----------|---------|-----------|-------|
| Hosting | Vercel Hobby | N/A | Free | 10s timeout, 100GB/mo, no Cron |
| Runtime | Node.js | 18.x LTS | Free | Included in Vercel |
| Framework | Express | 4.x | Free | Included in bundle |
| Database | MongoDB Atlas M0 | 7.x | Free | 512MB, 100 connections, shared vCPU |
| Driver | mongodb (native) | 6.x | Free | NPM package |
| Cache | In-memory Map | N/A | Free | Per-instance, lost on cold start |
| Auth | JWT (jsonwebtoken) | 9.x | Free | NPM package |
| Push | Firebase Admin SDK | 11.x | Free | FCM only — no Firestore |
| SMS | Console log only | N/A | Free | Twilio not used ($0) |
| Upload | Cloudinary direct | N/A | Free | 25GB storage, 25GB/mo bandwidth |
| Mobile | Flutter | 3.x | Free | Open source |
| Admin | Vanilla JS + Chart.js | Latest | Free | Static files served by Vercel |

## System Boundaries

### In Scope (Free-Tier Viable)
- Ride creation, acceptance, lifecycle (CRUD on MongoDB)
- OTP auth via phone (console mode, no Twilio)
- REST polling for real-time updates
- In-memory cache (per-instance Map)
- FCM push notifications (topic-based)
- Profile image upload (Cloudinary direct)
- Chat during ride (polling-based)
- Admin dashboard with aggregated stats
- Rate limiting (in-function, Vercel-compatible)
- CORS whitelist (env-configurable)
- Console SMS for OTP (no Twilio cost)

### Out of Scope (Requires Paid Services)
- Real-time WebSocket communication
- Redis or any external cache
- Cron jobs (Vercel Hobby limitation)
- File uploads through Vercel (10s timeout)
- Geo-spatial queries via $geoNear (M0 limitation)
- Sentry or external error tracking
- Staging/production separation (single Vercel project)
- CI/CD pipeline (manual deploy only)
- Twilio SMS
- iOS builds (no Mac builder)
- Automated backup/restore

## Major Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| M0 512MB fills up | App stops writing | TTL indexes purge OTP (5min), audit_log (30d), notifications (7d). Monitor monthly. |
| Vercel 10s timeout on admin stats | Admin panel broken | Split stats into 2-3 parallel queries; client-side aggregation; timeout at 8s. |
| REST polling overloads M0 shared CPU | Slow responses | Cache popular endpoints (online drivers, ride status); increase poll interval to 5s. |
| Cloudinary 25GB bandwidth exceeded | Uploads fail | Compress to 800px max; use WebP; set client-side file size limits. |
| Cold start latency on Vercel | First request slow | Keep-alive ping every 5 min; minimal module imports. |
| Flutter app expects Socket.io | Real-time broken | Remove socket.io-client; replace with polling loops + exponential backoff. |
| Firebase service account rotated | Push notifications break | Document rotation procedure; alert via console on failure. |

## Success Criteria

| Criterion | Current | Target |
|-----------|---------|--------|
| Android app builds with correct app ID | `com.example.ecommerce_app` | `com.weret.app` |
| Admin dashboard loads | ~4s | <2s |
| Ride request to driver notification | Broken (Socket.io) | <5s (polling) |
| Chat message delivery | Broken | <5s |
| OTP expires after 5 min | Never | TTL index enforces |
| Audit log retains 30 days | Forever | TTL index enforces |
| Push notifications | Broken | Working |
| Image upload | Broken | Working (Cloudinary) |
| Rate limiting | No-op | Enforced |
| Secrets in git | Exposed | None |
| Monthly bill | Unknown | **$0.00** |
| MongoDB storage used | Unknown | <450MB |
| Vercel bandwidth consumed | Unknown | <95GB/mo |
