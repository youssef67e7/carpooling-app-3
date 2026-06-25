# Migration Plan (Updated)

> **Last updated:** 2026-06-24  
> **Priority order:** correctness > maintainability > security > scalability > performance > cost > speed

---

## Phase 0: Infrastructure Gate — Immediate Blockers

**Goal:** Resolve blocking infrastructure issues before any code migration begins.

### Task 0.1 — Fix Android Application ID

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Duration** | 15 min |
| **Depends on** | Nothing |

**Problem:** `android/app/build.gradle.kts` has `applicationId = "com.example.ecommerce_app"` (template placeholder) while `namespace = "com.weret.app.weret_mobile"`. These must match. The wrong `applicationId` breaks Google Sign-In OAuth, Firebase integration, and Play Store uploads.

**Actions:**
```
1. Change applicationId to: com.weret.app (or com.weret.app.weret_mobile)
   - Update in apps/mobile-flutter/android/app/build.gradle.kts
   - Update in apps/mobile-flutter/android/app/google-services.json (package_name)
2. Verify google-services.json package_name matches new applicationId
3. Run flutter build apk --debug to confirm build succeeds
```

**Verification:** `flutter build apk --debug` completes without error.

---

### Task 0.2 — Configure Cloudinary (Env Only, No Code)

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 5 min |
| **Depends on** | Nothing |

**Status:** Credentials saved to `backend/.env`.

| Variable | Value |
|----------|-------|
| `CLOUDINARY_CLOUD_NAME` | `dixvj7zzs` |
| `CLOUDINARY_API_KEY` | `299489452134333` |
| `CLOUDINARY_API_SECRET` | `V_ChDYZxZZJlzAvkeIgIPamljr4` |

**Actions:**
```
1. Add CLOUDINARY_UPLOAD_PRESET to .env (create in Cloudinary Dashboard)
2. Verify credentials with a test API call (optional)
```

**Verification:** `curl https://api.cloudinary.com/v1_1/dixvj7zzs/image/upload` returns valid JSON.

---

### Task 0.3 — Verify MongoDB Atlas Credentials

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Duration** | 15 min |
| **Depends on** | Nothing |

**Current connection string:** `mongodb+srv://[REDACTED]:[REDACTED]@[REDACTED]/weret`

**Actions:**
```
1. Test connection: node scripts/test-atlas-connection.js (exists in backend/)
2. If connection fails, reset password in Atlas Dashboard and update .env
3. Verify read/write access by inserting + querying a test document
```

**Verification:** `node scripts/test-atlas-connection.js` exits with `0` and prints "Connection OK".

---

### Task 0.4 — Populate Flutter Google OAuth Client IDs

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 5 min |
| **Depends on** | Nothing |

**Source:** Backend `.env` has valid Google OAuth client IDs.
**Target:** Flutter `.env` — currently all `GOOGLE_*_CLIENT_ID` fields are empty.

**Actions:**
```
1. Copy these values from backend/.env to apps/mobile-flutter/.env:
   - GOOGLE_WEB_CLIENT_ID
   - GOOGLE_ANDROID_CLIENT_ID
   - GOOGLE_IOS_CLIENT_ID
2. Verify the IDs match the applicationId (Android) after Task 0.1
```

**Mapping:**

| Backend `.env` | Flutter `.env` |
|----------------|----------------|
| `GOOGLE_OAUTH_WEB_CLIENT_ID` | `GOOGLE_WEB_CLIENT_ID` |
| `GOOGLE_OAUTH_ANDROID_CLIENT_ID` | `GOOGLE_ANDROID_CLIENT_ID` |
| `GOOGLE_OAUTH_IOS_CLIENT_ID` | `GOOGLE_IOS_CLIENT_ID` |

**Verification:** Flutter Google Sign-In button calls `GoogleSignIn.signIn()` without "client ID mismatch" errors.

---

### Task 0.5 — Generate `.env.example`

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 10 min |
| **Depends on** | Nothing |

**Actions:**
```
1. Review current backend/.env for all keys
2. Remove all secret values (passwords, tokens, keys)
3. Replace with placeholder values like:
   - MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
   - JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   - GOOGLE_OAUTH_WEB_CLIENT_ID=<from Google Cloud Console>
4. Keep comments explaining each variable
5. Do the same for apps/mobile-flutter/.env.example
```

**Verification:** `diff <(sort .env.example | grep -v '^#') <(sort .env | grep -v '^#' | sed 's/=.*/=PLACEHOLDER/')` shows matching key names.

---

### Task 0.6 — Audit & Remove Firestore / Firebase Storage References

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 30 min |
| **Depends on** | Nothing |

**Finding:** Zero active usage of Firestore or Firebase Storage in the codebase. All references are:
- Configuration stubs (`firebase.json` → non-existent files)
- Planning/architecture docs describing intended-but-never-built features
- Legacy comments referencing Firestore as a comparison point

#### Complete Reference Inventory

| File | Line(s) | Type | Action |
|------|---------|------|--------|
| `firebase.json` | 2–4 | Config: declares firestore block, references missing `firestore.rules` and `firestore.indexes.json` | **REMOVE** the `firestore` block from `firebase.json` |
| `dcs/FIRESTORE_AR.md` | All | Architecture doc: planned Firestore listener flow | **KEEP** (reference — no code impact) |
| `dcs/FIRESTORE_SCHEMA.md` | All | Architecture doc: planned Firestore schema | **KEEP** (reference — no code impact) |
| `docs/FIRESTORE_AR.md` | All | Duplicate of dcs/FIRESTORE_AR.md | **KEEP** (reference) |
| `docs/FIRESTORE_SCHEMA.md` | All | Duplicate of dcs/FIRESTORE_SCHEMA.md | **KEEP** (reference) |
| `mobile-flutter/lib/core/providers/wallet_provider.dart` | 112, 121 | Legacy stub methods: `syncAccountsFromFirestore`, `syncTransactionsFromFirestore` | **RENAME** to remove "Firestore" from name (e.g., `syncAccounts`, `syncTransactions`) |
| `mobile-flutter/lib/core/sync/api_sync_bridge.dart` | 12 | Comment: "replaces Firestore listeners" | **UPDATE** comment to remove Firestore reference |
| `mobile-flutter/lib/features/auth/driver_wallet_screen.dart` | 4 | Comment: "same Firestore-backed wallet UI" | **UPDATE** comment |
| `backend/src/middleware/docId.js` | 3 | Comment: "UUID document id (Firestore)" | **UPDATE** comment to remove "Firestore" |
| `backend/src/routes/rides.js` | 237 | Comment: "atomic read-modify-write on Firestore" | **UPDATE** comment (actual code uses MongoDB) |

#### Architectural Docs to Update

| Document | References | Action |
|----------|-----------|--------|
| `ARCHITECTURE_CURRENT.md` | Firestore dir, empty firestore config | **UPDATE** to reflect zero Firestore usage |
| `ARCHITECTURE_TARGET.md` | Planned Firestore integration | **UPDATE** to remove Firestore from target architecture |
| `WERET_FULL_AUDIT.md` | Empty firestore directory noted | **UPDATE** to reflect removal |
| `AUDIT_VALIDATION.md` | Firestore findings | **UPDATE** |
| `ARCHITECTURE_FREEZE_COMPLETE.txt` | Multiple Firestore references | **REGENERATE** after other updates |

**Do NOT create:** `firebase/firestore.rules` or `firebase/firestore.indexes.json`. These files are not needed.

---

## Phase 1: Foundation (Week 1)

### Task 1.1 — Remove Exposed Secrets (Rotate + Git Purge)

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Duration** | 2 hours |
| **Depends on** | Task 0.3 (verified MongoDB access) |

```
1. Immediately rotate ALL secrets:
   - MongoDB: Change password in Atlas → update MONGODB_URI
   - JWT: Generate new secret
   - PHONE_OTP_SECRET: Generate new secret
2. Create .env.example with placeholder values (NO real secrets)
3. Ensure .env is in .gitignore (already done)
4. Verify: git log --all --diff-filter=A -- .env shows no results
```

### Task 1.2 — Add TTL Indexes

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 1 hour |
| **Depends on** | Task 1.1 |

```
1. Create scripts/create-indexes.js (see DATABASE_SPEC.md)
2. Run against production MongoDB: node scripts/create-indexes.js
3. Verify:
   - OTP documents disappear after 5 minutes
   - Audit log documents disappear after 30 days
```

### Task 1.3 — Fix CORS + Rate Limiting

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Duration** | 1 day |
| **Depends on** | Task 1.1 |

```
1. CORS:
   - Create whitelist: process.env.CORS_ORIGINS
   - Update cors() options in createApp.js
2. Rate limiting:
   - Implement Vercel-compatible rate limiter
   - Remove old no-op rate limiter
3. Test: non-whitelist origin → 403, >100/min → 429
```

---

## Phase 2: Data Layer (Week 1–2)

### Task 2.1 — ODM Rewrite: Basic CRUD

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Duration** | 2 days |
| **Depends on** | Task 1.2 |

```
1. Create mongo/db.js with native MongoDB driver connection wrapper
2. Create query modules per entity (users, drivers, rides, chat, notifications, payments, admin)
3. One service at a time, replace ODM calls with native driver calls
4. Run existing tests after each service migration
```

### Task 2.2 — ODM Rewrite: Aggregation

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Duration** | 1 day |
| **Depends on** | Task 2.1 |

```
1. Replace JS aggregation with MongoDB aggregation pipeline
2. Key pipelines: monthly revenue, driver nearby ($geoNear), admin dashboard ($facet)
3. Benchmark: admin stats <500ms target (from ~4s)
```

### Task 2.3 — Add In-Memory Cache

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 4 hours |
| **Depends on** | Task 2.1 |

```
1. Create utils/cache.js (Map<string, { value, expiresAt }>)
2. Apply to hot endpoints with TTL (online drivers: 5s, ride status: 3s, driver location: 3s)
3. Invalidate on writes
```

---

## Phase 3: Services (Week 2–3)

### Task 3.1 — Replace Socket.io with REST Polling

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Duration** | 3 days |
| **Depends on** | Task 2.1, 2.3 |

```
1. Create/update polling endpoints with ?since= param and 304 support
2. Implement SSE endpoints as optional upgrade
3. Update Flutter: remove socket.io-client, add polling with exponential backoff
4. Remove Socket.io server code
```

### Task 3.2 — Firebase Push Notifications (FCM)

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Duration** | 2 days |
| **Depends on** | Task 3.1 |

```
1. Initialize Firebase Admin SDK in backend (config/firebase.js)
2. Create notifyUser() function wrapping FCM send
3. Test with real FCM tokens
```

---

## Phase 4: Polish (Week 3–4)

### Task 4.1 — Cloudinary Direct Upload

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Duration** | 1 day |
| **Depends on** | Task 0.2 (config) |

```
1. Configure Cloudinary upload presets (signed) in Cloudinary Dashboard
2. Create signature endpoint POST /api/upload/signature
3. Update Flutter to upload directly to Cloudinary
4. Simplify /api/upload/profile-image to accept URL only
5. Remove multer dependency
```

### Task 4.2 — Error Tracking (Sentry)

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 4 hours |
| **Depends on** | Nothing |

```
1. npm install @sentry/node
2. Configure DSN from env
3. Add to errorHandler middleware
```

### Task 4.3 — Security Hardening

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 4 hours |
| **Depends on** | Task 1.3 (CORS) |

```
1. Add helmet middleware (security headers)
2. Add request size limiting
3. Add input sanitization
4. Audit all routes for authorization checks
```

### Task 4.4 — Flutter Optimization

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Duration** | 2 days |
| **Depends on** | Task 3.1 |

```
1. Remove unused Firebase packages from pubspec.yaml
2. Update all API calls to new REST polling pattern
3. Remove socket.io-client code
```

### Task 4.5 — Flutter Cleanup

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Duration** | 1 day |
| **Depends on** | Task 4.4 |

```
1. Remove unused files
2. Remove unused imports
3. Verify no build warnings
```

---

## Deferred (Future)

These items are moved out of the main migration sequence and will be addressed after all Phase 1–4 tasks are complete.

| Item | Reason for Deferral | Estimated Effort |
|------|-------------------|-----------------|
| **Vercel project setup** | App not yet ready for deployment | 1 hour |
| **GitHub Actions CI/CD** | No Vercel project to deploy to | 2 hours |
| **Staging environment** | Requires Vercel + separate Atlas cluster | 4 hours |
| **Twilio SMS** | SMS_CONSOLE_MODE=1 works for dev; Twilio is optional until production SMS needed | 1 hour |
| **iOS Firebase config** | Android-first development; iOS config not blocking | 30 min |
| **Release keystore / SHA** | Debug builds work; release signing only needed for Play Store | 30 min |
| **Firebase verification** | FCM push notifications deferred to Task 3.2 | Depends on Task 3.2 |

---

## Rollback Plan

| Task | Rollback |
|------|----------|
| Task 0.1 (App ID) | Revert build.gradle.kts to previous applicationId |
| Task 0.2 (Cloudinary config) | Remove env vars (no code change) |
| Task 0.3 (MongoDB verify) | Read-only test, no rollback needed |
| Task 0.4 (Flutter OAuth) | Revert .env values |
| Task 0.5 (.env.example) | No rollback needed (template only) |
| Task 0.6 (Firestore removal) | `git checkout -- firebase.json` + revert renamed functions |
| Task 1.1 (Secrets) | Revoke new secrets, restore old ones (irreversible if rotated) |
| Task 1.2 (TTL Indexes) | Drop TTL indexes, old documents remain (non-breaking) |
| Task 1.3 (CORS/Rate) | Revert CORS config, rate limit changes (instant) |
| Task 2.1–2.2 (ODM) | Keep old ODM file, redirect imports (template switch) |
| Task 2.3 (Cache) | Cache miss falls through to DB; zero risk |
| Task 3.1 (Polling) | Socket.io code still present in git history; re-deploy previous version |
| Task 3.2 (Push) | Old pushService.js available in git |
| Task 4.1 (Upload) | Revert to server-side upload (add multer back) |
| Task 4.2 (Sentry) | Remove Sentry DSN from env (non-breaking) |
| Task 4.3 (Security) | Revert middleware additions |
| Task 4.4–4.5 (Flutter) | Revert to previous Flutter build |

## Risk Table

| Task | Risk | Mitigation |
|------|------|-----------|
| 0.1 — App ID | 🟢 Low | Single file change; revert if build fails |
| 0.4 — OAuth | 🟢 Low | Env-only; no build impact |
| 0.6 — Firestore removal | 🟢 Low | All references are comments, docs, or config stubs; no active code |
| 1.1 — Secrets | 🔴 High | Rotate all simultaneously; test each rotation |
| 2.1 — ODM CRUD | 🔴 High | Migrate one service at a time; run tests after each |
| 3.1 — Polling | 🔴 High | Socket.io code kept until polling is verified |
| 4.4 — Flutter | 🟡 Medium | Socket.io-client kept until polling verified |
| 4.1 — Upload | 🟡 Medium | Temporary two-path approach (old + new) |
| 0.2 — Cloudinary | 🟢 Low | Env-only; no code change |
| 0.3 — MongoDB verify | 🟢 Low | Read-only; no rollback needed |
| 0.5 — .env.example | 🟢 Low | Template only; no impact |
| 1.2 — Indexes | 🟢 Low | Non-destructive; can drop anytime |
| 1.3 — CORS/Rate | 🟡 Medium | Test with admin panel before deploying |
| 2.2 — Aggregation | 🟡 Medium | Compare results with old JS aggregation for 48h |
| 2.3 — Cache | 🟢 Low | Cache miss falls through to DB; zero risk |
| 3.2 — Push | 🟡 Medium | Non-critical service; failure doesn't block app |
| 4.2 — Sentry | 🟢 Low | Read-only; add/remove anytime |
| 4.3 — Security | 🟢 Low | Additive only; no removals |
