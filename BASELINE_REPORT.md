# Baseline Verification Report — Task 0

> Generated: 2026-06-24  
> Project: WERET (ReachNative Car)  
> Status: **PASS** (all phases complete, non-blocking issues documented)

---

## 1. Environment

| Component  | Version   |
|------------|-----------|
| Node.js    | v22.20.0  |
| npm        | 11.0.0    |
| Flutter    | 3.44.2    |
| Dart       | 3.12.2    |
| OS         | Windows   |

---

## 2. Build Verification

### Backend (`backend/`)
- Entry point: `src/index.js`
- 70 JS files pass `node --check` (zero syntax errors)
- `node_modules/` installed (185 packages), no missing deps
- `createApp.js` loads cleanly (Express app factory)

### Flutter Mobile (`apps/mobile-flutter/`)
- `flutter pub get` succeeds
- 25 packages have newer versions available (see `flutter pub outdated`)
- 22 info-level lint issues (naming conventions, const constructors, deprecated `value` property, unused imports) — none blocking

### Admin Web (`apps/web/`)
- Static files pre-built:
  - `app.js` — 56 KB
  - `index.html` — 17 KB
  - `styles.css` — 39 KB
  - Icons (favicon, apple-touch-icon), logo PNGs
  - No build step required

---

## 3. Runtime Verification

| Attempt | Result |
|---------|--------|
| Backend startup (`node src/index.js`, `NODE_ENV=test`) | Server started, stayed alive 8+s, killed cleanly |
| In-memory MongoDB (`mongodb-memory-server`) | Auto-initialized, data seeded (6 drivers + 2 passengers + vehicle types) |
| Real Atlas connection | Not tested (no live Atlas in this env) |

---

## 4. Dependencies

### Backend Direct Dependencies (14)

| Package                | Version    | Notes             |
|------------------------|------------|-------------------|
| bcryptjs               | ^2.4.3     | Password hashing  |
| cors                   | ^2.8.5     | CORS middleware    |
| dotenv                 | ^16.4.5    | Env loader        |
| express                | ^4.21.1    | Web framework     |
| express-rate-limit     | ^8.5.0     | Rate limiting     |
| express-validator      | ^7.3.2     | Request validation|
| google-auth-library    | ^9.15.1    | Google OAuth      |
| helmet                | ^8.1.0     | Security headers  |
| jsonwebtoken           | ^9.0.2     | JWT               |
| mongodb                | ^6.16.0    | MongoDB driver    |
| mongodb-memory-server  | ^11.2.0    | Test DB           |
| multer                | ^2.1.1     | File uploads      |
| socket.io             | ^4.8.1     | WebSocket/real-time|
| undici                | ^7.0.0     | HTTP client       |

### Flutter Dependencies
- State management: Riverpod, flutter_riverpod, riverpod_annotation
- Networking: dio, socket_io_client (deprecated — planned for removal)
- Localization: easy_localization, intl
- Storage: shared_preferences, flutter_secure_storage
- Maps: flutter_map, mapbox_gl (planned migration)
- Firebase: firebase_core, firebase_auth, cloud_firestore, firebase_storage (not yet configured in app)

### npm Audit Results ⚠️

| Severity | Count | Packages |
|----------|-------|----------|
| **High** | 2     | multer (DoS via nested fields + incomplete cleanup), undici (TLS bypass, DoS, HTTP injection, XSS) |
| **Moderate** | 9 | engine.io, express, express-rate-limit, gaxios, ip-address, qs, socket.io-adapter, uuid, ws |
| **Low** | 2     | undici (response queue poisoning, SameSite downgrade) |

All vulnerabilities have fixes available via `npm audit fix`.

---

## 5. Git Baseline

| Metric | Value |
|--------|-------|
| Branch | `main` |
| Commits | **0** (fresh repo, never committed) |
| Tracked files | None |
| Untracked | All project files (including architecture docs, source, etc.) |
| `.gitignore` | Properly excludes `.env`, `node_modules/`, `*.apk`, `*.aab`, `firebase-service-account.json`, build artifacts, IDE files |
| `.env` tracking | **Not tracked** (covered by `.gitignore` patterns `.env` + `.env.*`) |

**⚠️ Risk**: Once first commit is made, `backend/.env` contains live secrets (MongoDB password, JWT secret, OAuth IDs, admin plaintext passwords). As long as `.gitignore` excludes `.env`, these are safe — but the plaintext admin passwords in `.env` should be replaced with bcrypt hashes per architecture rules.

---

## 6. Environment Variables

### Backend (`backend/.env`)
| Var | Value | Status |
|-----|-------|--------|
| PORT | 3000 | ✅ Default |
| JWT_SECRET | set (32-byte hex) | ✅ Present |
| MONGODB_URI | `mongodb+srv://...` (Atlas) | ⚠️ Live password |
| MONGODB_DB_NAME | weret | ✅ |
| MONGODB_ATLAS_REQUIRED | 1 | ✅ |
| UPLOAD_STORAGE | local | ✅ |
| GOOGLE_OAUTH_WEB_CLIENT_ID | set | ✅ |
| GOOGLE_OAUTH_ANDROID_CLIENT_ID | set | ✅ |
| GOOGLE_OAUTH_IOS_CLIENT_ID | set | ✅ |
| PHONE_OTP_SECRET | set | ✅ |
| SMS_CONSOLE_MODE | 1 | ✅ (no Twilio yet) |
| RATE_LIMIT_WINDOW_MS | 900000 | ✅ |
| RATE_LIMIT_MAX | 500 | ✅ |
| AUTH_RATE_LIMIT_WINDOW_MS | 900000 | ✅ |
| AUTH_RATE_LIMIT_MAX | 30 | ✅ |
| ADMIN_PASSWORD_YOUSSEF | [REDACTED] | ⚠️ **Plaintext, should use bcrypt** |
| ADMIN_PASSWORD_YOUSSEF1 | [REDACTED] | ⚠️ **Plaintext, should use bcrypt** |

### Mobile Flutter (`apps/mobile-flutter/.env`)
| Var | Value |
|-----|-------|
| API_URL | `http://192.168.1.11:3000` |
| GOOGLE_WEB_CLIENT_ID | (empty) |
| GOOGLE_ANDROID_CLIENT_ID | (empty) |
| GOOGLE_IOS_CLIENT_ID | (empty) |

### Mobile Flutter (`.env.vscode`)
| Var | Value |
|-----|-------|
| API_URL | `http://26.56.11.72:3000` |

### Firebase Service Account
- `backend/firebase-service-account.json`: 2.4 KB, present on disk, properly gitignored

---

## 7. Test Baseline

### Backend Tests (`npm test` — Node `--test` runner)

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| auth flows integration | 3 | 3 | 0 |
| emailOtp utils | 2 | 2 | 0 |
| fixed admins | 2 | 2 | 0 |
| google auth config | 3 | 3 | 0 |
| phoneOtp utils | 7 | 7 | 0 |
| sendSms helpers | 1 | 1 | 0 |
| **Total** | **18** | **18** | **0** |

### Flutter Tests (`flutter test`)

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| auth_validators_test | 1 | 1 | 0 |
| widget_test | 5 | 5 | 0 |
| **Total** | **6** | **6** | **0** |

---

## 8. Performance Baseline

| Metric | Value |
|--------|-------|
| Backend source size (JS+JSON, excl. node_modules) | ~15 MB |
| Backend source files | 2,941 files, 658 directories |
| Backend startup time (no Atlas) | ~3-4s (in-memory DB spin-up) |
| Backend test suite runtime | ~3.8s |
| Flutter test suite runtime | ~0.1s |
| Admin web `app.js` size | 56 KB (unminified) |
| Admin web total static assets | ~358 KB |

---

## 9. Architecture Document Status

All 17 architecture freeze documents produced and validated:
- `WERET_FULL_AUDIT.md` + `AUDIT_VALIDATION.md`
- `ARCHITECTURE_CURRENT.md`, `ARCHITECTURE_TARGET.md`, `ARCHITECTURE_RULES.md`
- `INFRASTRUCTURE.md`, `ENVIRONMENT_SPEC.md`, `DATABASE_SPEC.md`, `API_SPEC.md`
- `REALTIME_STRATEGY.md`, `UPLOAD_STRATEGY.md`, `NOTIFICATION_STRATEGY.md`
- `TEST_PLAN.md`, `MIGRATION_PLAN.md`, `DEPLOYMENT_GUIDE.md`
- `PROJECT_MASTER_PLAN.md`, `MISSING_INFRASTRUCTURE.md`
- Concatenated archive: `ARCHITECTURE_FREEZE_COMPLETE.txt` (3,717 lines)

---

## 10. Issues & Risks

### Blocking
- **None** — all builds pass, all tests pass, environment is functional

### Non-Blocking (Documented for Task 1+)
1. **NPM vulnerabilities** — 11 advisories (2 high), all fixable via `npm audit fix` — recommend fixing before production
2. **Plaintext admin passwords** in `backend/.env` — should use `ADMIN_BCRYPT_YOUSSEF` (bcrypt hash) instead
3. **socket_io_client** deprecated in Flutter — planned for removal in migration
4. **25 outdated Flutter packages** — review before migration (major version bumps for dio, firebase)
5. **Flutter 22 lint issues** — naming conventions, const constructors, deprecated APIs — address during migration
6. **Zero git commits** — initial commit needed to establish baseline
7. **No Twilio configured** — SMS_CONSOLE_MODE=1, Twilio vars empty (expected for dev)
8. **Google OAuth client IDs empty in Flutter .env** — needed for mobile Google Sign-In

---

## 11. Governance Rules Status

All 17 rules acknowledged and will gate future tasks:
- Priority: correctness > maintainability > security > scalability > performance > cost > speed
- Pre-task reading: PROJECT_MASTER_PLAN.md, MIGRATION_PLAN.md, ARCHITECTURE_RULES.md, relevant specs
- Infrastructure, dependency, API, DB, security, testing, documentation gates active
- Completion reports mandatory after each task; stop-for-approval before next task

---

**Task 0 complete. Ready for approval to proceed to Task 1.**
