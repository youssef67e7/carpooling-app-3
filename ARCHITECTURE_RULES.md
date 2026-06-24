# Phase 4 — Architecture Rules

## 1. Module Boundaries

### Backend (`api/`)
```
api/
├── routes/        # Request handling (thin — parse, validate, respond)
├── middleware/    # Request pipeline (auth, rate-limit, error, validate)
├── services/     # Business logic (no HTTP concerns)
├── mongo/        # Database access (ODM/native driver — no business logic)
├── socket/       # Socket.io (to be removed)
├── utils/        # Pure utility functions
└── config/       # Environment-driven configuration
```

**Rules:**
- Routes MUST NOT call `mongo/` directly — go through services
- Services MUST NOT import HTTP-related modules (`req`, `res`, `socket.io`)
- `mongo/` MUST NOT contain business logic — only queries and aggregations
- `utils/` MUST be pure functions with no side effects

### Flutter Mobile (`mobile/lib/`)
```
mobile/lib/
├── models/          # Data classes (freezed/json_serializable)
├── providers/       # Riverpod state management
├── screens/         # Full-page widgets
├── widgets/         # Reusable UI components
├── services/        # API calls, location, auth
├── utils/           # Pure helpers, formatters
└── core/            # Theme, constants, routing
```

## 2. Communication Patterns

| Direction | Pattern | Notes |
|-----------|---------|-------|
| Mobile → API | REST (fetch) | Always use HTTPS |
| API → Mobile | REST response | No push from API; FCM for alerts |
| Mobile → Mobile | Never direct | Always mediated by API |
| Admin → API | REST (fetch) | Same endpoints, admin auth |
| API → DB | Native MongoDB driver | Never ODM in-memory operations |
| API → FCM | Firebase Admin SDK | Push notifications only |

## 3. State Management

- **Server state**: MongoDB (source of truth)
- **Cache state**: In-memory Map (ephemeral, per-Vercel-instance)
- **Client state (Mobile)**: Riverpod providers
- **Client state (Admin)**: In-memory JS vars (no framework)

**Rule:** Cache invalidation must be time-based (TTL). No cache coherence protocol.

## 4. Error Handling

```
All errors flow through errorHandler middleware:
  err.code    → HTTP status mapping
  err.message → Client-safe message (no stack traces)
  err.log     → Structured log entry (internal)

Unified error shape:
  { error: { code: "VALIDATION_ERROR", message: "...", details?: {} } }
```

## 5. Authentication & Authorization

- **Auth**: JWT Bearer token in `Authorization` header
- **Role check**: `authMiddleware(['admin', 'driver', 'user'])` at route level
- **No refresh tokens**: 60d JWT expiry; re-login required
- **Admin routes**: JWT + IP whitelist (configurable via env)

## 6. Rate Limiting

- `api/middleware/rateLimiters.js` — must work on Vercel
- Global: 100 req/min per IP
- Auth endpoints: 5 req/min per IP
- Ride creation: 10 req/min per user
- OTP send: 3 req/min per phone
- Admin: 30 req/min per IP

## 7. Data Validation

- Input validation: `middleware/validate.js` using Zod schemas
- Sanitization: Strip HTML tags from string inputs
- No eval, no `new Function`, no dynamic require
- All IDs must be MongoDB ObjectId or UUID

## 8. File Uploads

- Flutter uploads directly to Cloudinary (not through Vercel)
- Cloudinary returns URL → Flutter sends URL to API in request body
- API never stores files locally

## 9. Real-time (REST Polling)

- Polling intervals are defined per-endpoint (not configurable per user)
- Server responds with `304 Not Modified` if no change (using `If-Modified-Since` headers where feasible)
- Chat messages use `?since=<ISO timestamp>` to return only new messages
- Client must handle stale data (race conditions) gracefully

## 10. Database

- All queries must use indexes (verified via `explain()`)
- `aggregate()` pipelines preferred over multiple `find()` + JS reduce
- TTL index on `otp.createdAt` (5 min expiry)
- TTL index on `audit_log.createdAt` (30 day expiry)
- No `$where`, no `$eval`, no server-side JS

## 11. Environment Configuration

```
VITE_*        → Flutter compile-time (in .env)
NEXT_PUBLIC_* → Admin panel (if using Next.js; not applicable currently)
Other env vars → Vercel Environment Variables (not in .env committed)
```

## 12. Testing

- Unit tests: Services + utils (Vitest)
- Integration tests: API routes (Supertest + test MongoDB)
- E2E: Cypress (admin panel) + Flutter integration tests (mobile)
- Coverage target: 80%+ on services, 60%+ on routes
- No production DB in tests

## 13. Deployment

- Vercel deploys from `main` branch
- Staging: `staging` branch → Vercel preview deployment
- Environment variables set in Vercel dashboard (never in repo)
- Migrations run via Vercel Cron or one-off scripts

## 14. Secrets Management

- NEVER commit `.env` or any file containing secrets
- Use `git-secrets` or similar pre-commit hook
- Rotate secrets if exposed (current `.env` already committed — see Migration Plan)
- Service account keys stored as Vercel encrypted environment variables

## 15. Code Review Rules

- No PR > 400 lines (split into smaller changes)
- Every PR must include: tests, updated type definitions, migration notes if applicable
- Architecture Rule changes require team consensus (documented in this file)
