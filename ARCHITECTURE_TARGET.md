# Phase 3 — Target Architecture (To-Be)

## Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Vercel (Serverless)                            │
│                                                                         │
│  ┌─────────────────────┐    ┌──────────────────────────────────────┐   │
│  │    Express App       │    │    REST Polling Endpoints            │   │
│  │    (createApp.js)    │    │                                      │   │
│  │                      │    │  GET /api/rides/:id/status          │   │
│  │  ┌── routes/ ──────┐ │    │  GET /api/chat/:rideId/messages?since│   │
│  │  │  (same as now)  │ │    │  GET /api/drivers/:id/location      │   │
│  │  └─────────────────┘ │    │  GET /api/notifications?since       │   │
│  │                      │    │  GET /api/drivers/online            │   │
│  │  ┌── middleware/ ──┐ │    └──────────────────────────────────────┘   │
│  │  │  auth.js        │ │                                              │
│  │  │  rateLimiter.js │ │    ┌──────────────────────────────────────┐   │
│  │  │  errorHandler   │ │    │   In-Memory Cache (Map)              │   │
│  │  │  validate.js    │ │    │   - Online driver IDs (5s TTL)       │   │
│  │  └─────────────────┘ │    │   - Active ride counts (3s TTL)      │   │
│  │                      │    │   - Static config (60s TTL)          │   │
│  │  ┌── services/ ────┐ │    └──────────────────────────────────────┘   │
│  │  │  otpService.js  │ │                                              │
│  │  │  pushService.js │ │    ┌──────────────────────────────────────┐   │
│  │  │  emailService   │ │    │   Vercel Cron (cron.json/vercel.json) │  │
│  │  └─────────────────┘ │    │   - Every 5min: cleanup expired OTPs  │   │
│  │                      │    │   - Every 15min: cleanup audit_log    │   │
│  │  ┌── mongo/ ───────┐ │    │   - Every 1hr: aggregate stats       │   │
│  │  │  odm.js (rewrite)│ │    └──────────────────────────────────────┘   │
│  │  │  connection.js  │ │                                              │
│  │  └─────────────────┘ │                                              │
│  └─────────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   MongoDB Atlas       │    │   Cloudinary              │
│   (M7 cluster)        │    │   (image hosting)         │
│                       │    │                           │
│  Collections:         │    │  Signed URLs with expiry  │
│  - users              │    │  WebP auto-format         │
│  - drivers            │    │  Auto-upload from client  │
│  - rides              │    │  (direct upload from      │
│  - riders             │    │   Flutter via upload      │
│  - otp (TTL index)    │    │   preset)                 │
│  - transactions       │    │                           │
│  - subscriptions      │    └──────────────────────────┘
│  - reviews            │
│  - audit_log (TTL)    │    ┌──────────────────────────┐
│  - reports            │    │   Firebase Cloud         │
│  - notifications      │    │   Messaging (FCM)        │
│  - payment_intents    │    │   (working config)       │
│  - promo_codes        │    │                           │
│  - emergency_alerts   │    │  Topics:                 │
│  - saved_locations    │    │  - driver_{id}           │
│  - service_areas      │    │  - user_{id}             │
│  - sms_log            │    │  - admin_alerts          │
│                       │    └──────────────────────────┘
│  Indexes:             │
│  - rides.status + loc │    ┌──────────────────────────┐
│  - users.role         │    │   Sentry                 │
│  - drivers.online     │    │   (error tracking)       │
│  - otp.createdAt TTL  │    └──────────────────────────┘
│  - audit_log.createdAt│
└──────────────────────┘
```

## Data Flow — Ride Lifecycle (Target)

```
User Request ──► POST /api/rides ──► Native find(drivers) via DB
                         │
                         ▼
              DB-side $geoNear (if location data exists)
              or indexed find(online, available)
                         │
                         ▼
              Store ride → update cache → respond 201
              Mobile polls GET /rides/:id/status every 2s
                         │
                         ▼
              Driver polls GET /rides/requested every 3s
              Driver accepts ──► POST /api/rides/:id/accept
                         │
                         ▼
              Status updates via REST polling (2-5s intervals)
              Chat via GET/POST /api/chat/:rideId
              Location via GET/POST /api/drivers/:id/location
```

## Authentication Flow (Target — Unchanged)

Same as current JWT flow. No changes needed.

## Data Flow — Admin Panel (Target)

```
Admin Web ──► GET /api/admin/stats
                  │
                  ▼
              Parallel queries (Promise.all):
              - User count (indexed countDocuments)
              - Driver count + online (indexed)
              - Ride stats (aggregate pipeline, DB-side)
              - Revenue (aggregate pipeline, DB-side)
              - Subscriptions (indexed find)
              - Audit tail (indexed find + limit)
                  │
                  ▼
              Merged JSON → chart render
              Response time target: <1s (currently ~4s)
```

## Real-time Communication (Target)

```
REST Polling (replaces Socket.io entirely)
├── Ride status     → GET /api/rides/:id/status          (2s interval)
├── Chat messages   → GET /api/chat/:rideId/messages     (3s interval)
├── Driver location → GET /api/drivers/:id/location      (3s interval)
├── Notifications   → GET /api/notifications?since=<ts>  (5s interval)
└── Online drivers  → GET /api/drivers/online            (5s interval)

Write operations remain REST:
├── Chat send       → POST /api/chat/:rideId/send
├── Location update → POST /api/drivers/:id/location
├── Ride action     → POST /api/rides/:id/{accept,start,end,cancel}
└── Status heartbeat→ POST /api/drivers/:id/heartbeat (every 30s)
```

## Architectural Decisions Record

| Decision | Rationale |
|----------|-----------|
| Replace Socket.io with REST polling | Vercel serverless incompatible with WebSocket persistence |
| Rewrite ODM to push queries to DB | Current in-memory ODM cannot scale beyond ~1000 documents |
| Add in-memory cache layer | Reduces DB load on hot endpoints (driver status, ride counts) |
| Migrate to native MongoDB driver | Eliminates ODM abstraction overhead |
| Keep JWT auth as-is | No security issues, 60d expiry is acceptable |
| Add TTL indexes to OTP + audit_log | Prevents unbounded collection growth |
| Add rate limiting via Vercel middleware | Required for production safety |
| Stricter CORS (whitelist origins) | Security hardening |
| Cloudinary direct upload from client | Eliminates `/tmp` ephemeral storage issue |
| Fix Firebase service account | Enables push notifications (currently broken) |
| Remove all unused Firebase services | `firebase-config.js` loads 6 unused SDKs |

## Technology Stack (Target)

| Layer | Technology | Version | Change |
|-------|-----------|---------|--------|
| Runtime | Node.js | 18.x LTS | None |
| Framework | Express | 4.x | None |
| Database | MongoDB Atlas (M7) | 7.x | None |
| Driver | mongodb (native) | 6.x | **New** — replaces custom ODM |
| Real-time | REST polling | N/A | **New** — replaces Socket.io |
| Cache | In-memory Map | N/A | **New** |
| Auth | JWT (jsonwebtoken) | 9.x | None |
| Push | Firebase Admin (fixed) | 11.x | **Fixed** |
| SMS | Twilio | 4.x | None |
| Upload | Cloudinary direct | Latest | **Changed** — client uploads directly |
| Email | Nodemailer | 6.x | None |
| Mobile | Flutter | 3.x | None |
| Admin | Vanilla JS + Chart.js | Latest | None |
| Hosting | Vercel (Serverless) | N/A | None |
| Error tracking | Sentry | Latest | **New** |
