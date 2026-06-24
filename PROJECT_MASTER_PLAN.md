# Project Master Plan

> **Last updated:** 2026-06-24  
> **Constraint:** Free-tier only — graduation project, zero budget.

---

## Goal

Transform the ReachNative Car codebase from a non-functional prototype (Socket.io on Vercel, in-memory ODM, broken Firebase, committed secrets) into a working ride-hailing platform using **only free-tier services**.

## Free-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│                  Vercel Hobby                     │
│  ┌───────────────────────────────────────────┐   │
│  │        Express API (serverless)            │   │
│  │  ┌───────┐ ┌──────────┐ ┌─────────────┐  │   │
│  │  │Routes │ │Middleware│ │  Services    │  │   │
│  │  └───────┘ └──────────┘ └─────────────┘  │   │
│  │  ┌────────────────────────────────────┐   │   │
│  │  │  In-Memory Cache (Map, per-inst.)  │   │   │
│  │  └────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│ MongoDB M0   │ │Cloudinary│ │ Firebase │
│ (512MB, free)│ │ (Free 25G)│ │ FCM only │
└──────────────┘ └──────────┘ └──────────┘
```

## Free-Tier Limits That Shape Architecture

| Service | Limit | Impact on Design |
|---------|-------|-----------------|
| **Vercel Hobby** | 10s function timeout, 100GB bandwidth, no Cron, 3 concurrent instances | No long-running ops; TTL indexes replace Cron; no WebSocket |
| **MongoDB M0** | 512MB storage, 100 connections, shared vCPU, no $geoNear with 2dsphere (sort only) | Driver geo-lookup via JS sort; keep collections lean; TTL indexes remove stale data |
| **Cloudinary Free** | 25GB storage, 25GB/month bandwidth | Compress images client-side; set max dimensions; use WebP auto |
| **Firebase FCM** | Unlimited push, no cost | Push notifications only; no Firestore, no Realtime DB |
| **No Redis** | Not available | In-memory Map cache (per-instance, lost on cold start) |
| **No paid services** | $0 budget | Everything must fit within free quotas; no Sentry (console logging only) |

## Timeline

```
Week 1 ─── Foundation ─── Tasks 1-5
  Mon:  Android app ID fix (Task 1)
  Mon:  Cloudinary config (Task 2)
  Tue:  MongoDB Atlas verify (Task 3)
  Tue:  Flutter OAuth population (Task 4)
  Wed:  .env.example generation (Task 5)

Week 2 ─── Data Layer ─── Tasks 6-8
  Mon-Wed: ODM rewrite — basic CRUD (Task 6)
  Thu:     ODM rewrite — aggregation (Task 7)
  Fri:     In-memory cache (Task 8)

Week 3 ─── Services ─── Tasks 9-11
  Mon-Wed: Replace Socket.io with REST polling (Task 9)
  Thu-Fri: Fix Firebase push + admin stats (Task 10)
  Fri:     Security hardening (Task 11)

Week 4 ─── Polish ─── Tasks 12-14
  Mon:  Cloudinary direct upload (Task 12)
  Tue:  Flutter optimization (Task 13)
  Wed:  Flutter cleanup (Task 14)
  Thu:  Final integration test + deploy to Vercel (Task 15)
```

## Task Dependency Graph

```
Task 1 (App ID) ───► Task 3 (MongoDB verify)
Task 2 (Cloudinary) ─── Standalone
Task 3 (MongoDB) ───► Task 6 (ODM CRUD) ───► Task 7 (Aggregation)
                                                │
                                                ▼
                                           Task 8 (Cache)
                                                │
                                                ▼
                                           Task 9 (Polling)
                                                │
                                                ▼
                                           Task 10 (Push)

Task 11 (Security) ─── Standalone (after Task 9 CORS fix)
Task 12 (Upload) ─── Standalone (after Task 2 config)
Task 13 (Flutter) ───► Task 14 (Flutter Cleanup)
Task 15 (Deploy) ─── After all tasks
```

## Success Criteria

| Criterion | Current | Target | Measured By |
|-----------|---------|--------|-------------|
| Android app builds | Placeholder app ID | Correct app ID | `flutter build apk --debug` |
| Admin stats page load | ~4s | <1s | Browser DevTools |
| Ride request → driver notified | Broken | <5s | End-to-end test |
| Chat message delivery | Broken | <5s | End-to-end test |
| OTP expiry | Infinite | 5 min | Verification |
| Audit log retention | Infinite | 30 days | MongoDB TTL |
| Push notifications | Broken | Working | Device test |
| Image upload | Broken | Working | End-to-end test |
| Rate limiting (Vercel-friendly) | No-op | Enforced | Load test |
| Secrets in git | Exposed | None | `git log --all --diff-filter=A -- .env` |
| No paid services | N/A | $0/mo bill | Invoice check |
| MongoDB M0 storage | N/A | <450MB used | Atlas dashboard |
| Vercel Hobby bandwidth | N/A | <95GB/mo | Vercel dashboard |

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ODM rewrite breaks queries | Medium | High | Migrate one service at a time, test after each |
| REST polling overwhelms M0 | Medium | Medium | Cache + indexed queries; limit poll rate client-side |
| M0 512MB storage exceeded | Medium | High | TTL indexes on OTP, audit_log, notifications; monitor monthly |
| M0 100 connection limit | Low | Medium | Connection pooling with max 5 concurrent; Vercel scales slowly |
| Secrets already compromised | Unknown | Critical | Rotate immediately |
| Vercel 10s timeout on aggregates | Low | Medium | Split large aggregations; add .timeout(8000) on queries |
| Cloudinary 25GB bandwidth exceeded | Low | Medium | Compress images client-side; limit upload resolution |
| No paid upgrade path for demo | Low | Low | Acceptable for graduation; document migration steps |

## Deliverables

| Document | Status |
|----------|--------|
| Full Audit (`WERET_FULL_AUDIT.md`) | ✅ Complete |
| Audit Validation (`AUDIT_VALIDATION.md`) | ✅ Complete |
| Current Architecture (`ARCHITECTURE_CURRENT.md`) | ✅ Complete |
| Target Architecture (`TARGET_ARCHITECTURE.md`) | ✅ Complete |
| Architecture Rules (`ARCHITECTURE_RULES.md`) | ✅ Complete |
| Infrastructure (`INFRASTRUCTURE.md`) | ✅ Complete |
| Environment Spec (`ENVIRONMENT_SPEC.md`) | ✅ Complete |
| Database Spec (`DATABASE_SPEC.md`) | ✅ Complete |
| API Spec (`API_SPEC.md`) | ✅ Complete |
| Free-Tier Strategy (`FREE_TIER_STRATEGY.md`) | ✅ Complete |
| Real-time Strategy (`REALTIME_STRATEGY.md`) | ✅ Complete |
| Upload Strategy (`UPLOAD_STRATEGY.md`) | ✅ Complete |
| Notification Strategy (`NOTIFICATION_STRATEGY.md`) | ✅ Complete |
| Test Plan (`TEST_PLAN.md`) | ✅ Complete |
| Migration Plan (`MIGRATION_PLAN.md`) | ✅ Complete |
| Deployment Guide (`DEPLOYMENT_GUIDE.md`) | ✅ Complete |
| Project Master Plan (`PROJECT_MASTER_PLAN.md`) | ✅ Complete |
| Missing Infrastructure (`MISSING_INFRASTRUCTURE.md`) | ✅ Complete |
