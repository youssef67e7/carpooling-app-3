# Session Summary

## Goal
Add navigation tracing to debug logs and review all MDs to identify project standards.

## Progress

### Done
- **Navigation tracing enhanced** in `app_router.dart:23-50`:
  - `_ScreenLogObserver` now overrides `didPush`, `didPop`, and `didReplace`
  - `didPop`: logs `POP from → to`, updates current screen
  - `didReplace`: logs `REPLACE old → new`, updates current screen
  - `redirect` callback now logs every redirect with reason (not hydrated, unauthenticated, already logged in, admin/passenger/driver role redirect)
- **Full MD standards review** — 40+ markdown files analyzed, all standards extracted into structured summary below

### Key Standards Found (from MD review)

#### Architecture Rules
| Rule | Description |
|------|-------------|
| Layer isolation | Routes → Services → Mongo (ODM). Routes MUST NOT call mongo/ directly |
| Services | MUST NOT import HTTP modules (req, res, socket.io) |
| Mongo layer | MUST NOT contain business logic — only queries/aggregations |
| Utils | MUST be pure functions with no side effects |
| Auth middleware chain | `authRequired` → `blockCheck` → `roleRequired(...)` → handler |
| Error format | `{ error: { code: "ERROR_CODE", message: "...", details?: {} } }` |
| No Socket.io | REST polling only (Vercel serverless incompatible) |
| No Firestore | MongoDB only source of truth |
| FCM only for push | No Firestore, no Realtime DB |
| Cloudinary for images | Base64 JSON upload (no multer — Vercel incompatible) |

#### Coding Conventions
| Convention | Standard |
|------------|----------|
| Backend language | Vanilla JS (no TypeScript, no ESLint, no Prettier) |
| Mobile framework | Flutter with Riverpod state management |
| File naming | Lowercase with hyphens for backend, snake_case for Flutter? (verify) |
| Priority order | correctness > maintainability > security > scalability > performance > cost > speed |
| Input validation | Zod schemas in `middleware/validate.js` |
| ID format | MongoDB ObjectId or UUID |
| API versioning | Not implemented (noted as missing) |
| Ride state machine | `pending → accepted → ongoing → completed` (missing: `driver_arriving`, `passenger_onboard`) |

#### Security Standards
| Standard | Detail |
|----------|--------|
| Auth | JWT Bearer token in `Authorization` header |
| Role check | `roleRequired(['admin', 'driver', 'user'])` at route level |
| Token expiry | 60d JWT, no refresh tokens |
| Rate limiting | Global 100/min, Auth 5/min, Ride 10/min, OTP 3/min, Admin 30/min |
| CORS | Whitelist from `CORS_ORIGINS` env var only (never `*`) |
| Security headers | `helmet` middleware required |
| No secrets in git | `.env` gitignored, Vercel env vars for production |
| Upload security | Flutter → Cloudinary directly (not through Vercel) |
| Ownership verification | Cloudinary `public_id` contains `userId` |

#### Documentation Standards
- 18 required docs listed in `PROJECT_MASTER_PLAN.md` (see below)
- Validation reports use standardized tables (Test | Result | Verdict)
- No `.env` or secrets in documentation (use `[REDACTED]`)
- Completion reports mandatory after each task
- Stop-for-approval before next task

#### Required Documentation Files
`WERET_FULL_AUDIT.md`, `AUDIT_VALIDATION.md`, `ARCHITECTURE_CURRENT.md`, `TARGET_ARCHITECTURE.md`, `ARCHITECTURE_RULES.md`, `INFRASTRUCTURE.md`, `ENVIRONMENT_SPEC.md`, `DATABASE_SPEC.md`, `API_SPEC.md`, `FREE_TIER_STRATEGY.md`, `REALTIME_STRATEGY.md`, `UPLOAD_STRATEGY.md`, `NOTIFICATION_STRATEGY.md`, `TEST_PLAN.md`, `MIGRATION_PLAN.md`, `DEPLOYMENT_GUIDE.md`, `PROJECT_MASTER_PLAN.md`, `MISSING_INFRASTRUCTURE.md`

#### Testing Standards
- Unit: Services + utils (Vitest)
- Integration: API routes (Supertest + mongodb-memory-server)
- E2E: Cypress (admin) + Flutter integration (mobile)
- Coverage: Services 80%+, Middleware 90%+, Routes 60%+, Utils 100%, ODM 70%+, Overall 75%+
- PR size limit: 400 lines max
- Every PR must include tests, updated types, migration notes

#### Free-Tier Constraints
- Vercel Hobby: 10s timeout, 100GB/mo bandwidth, no Cron, 3 instances
- MongoDB M0: 512MB, 100 connections
- Cloudinary Free: 25GB storage, 25GB/mo bandwidth
- No Redis (in-memory Map cache)
- No Sentry (console logging only)
- SMS_CONSOLE_MODE=1 (no Twilio)

### Relevant Files
- `apps/mobile-flutter/lib/core/router/app_router.dart` — Enhanced `_ScreenLogObserver` with didPop, didReplace, redirect tracing
- `apps/mobile-flutter/lib/core/services/debug_logger.dart` — Singleton logger (navigation, network, taps, errors to .txt file)
- `apps/mobile-flutter/lib/shared/widgets/logged_button.dart` — LoggedButton, LoggedIconButton, LoggedListTile
- `apps/mobile-flutter/lib/features/debug/debug_log_screen.dart` — In-app log viewer

### Next Steps
- Verify navigation tracing works: `flutter run` → check `/debug/log` for `📱 POP`, `📱 REPLACE`, `📱 REDIRECT` entries
- Apply identified standards rules to new code going forward
- Fix missing ride states (`driver_arriving`, `passenger_onboard`)
- Fix ODM `save()` for `selectedCarId`
- Fix `POST /api/driver/cars` to initialize `prof.cars`
