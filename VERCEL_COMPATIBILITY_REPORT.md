# Vercel Compatibility Report

> **Target:** Vercel Hobby (free tier)  
> **Audit date:** 2026-06-24  
> **Entry point:** `api/index.js` (serverless handler)  
> **Local entry (not deployed):** `src/index.js` (server with `http.createServer` + `server.listen`)

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Compatible | 4 |
| ⚠️ Minor issue | 6 |
| ❌ Incompatible | 7 |
| **Total findings** | **17** |

---

## 1. `src/index.js` — `http.createServer` + `server.listen()`

| Field | Value |
|-------|-------|
| **File** | `backend/src/index.js:4,12,124` |
| **Issue** | Creates an HTTP server with `http.createServer(app)` and binds it to a port via `server.listen(PORT)`. This is the classic long-running server pattern. Vercel serverless functions must NOT listen on a port — they export a `(req, res) => handler` function. |
| **Impact** | This file is **not called on Vercel** (`api/index.js` is used instead). However, the mere presence of `import { Server as SocketIOServer } from "socket.io"` at line 4 means if any import chain pulls in `index.js`, the entire Socket.io library gets bundled into the deployment (bloating cold starts). |
| **Fix** | Ensure no import path reaches `index.js` from `api/index.js`. Currently `api/index.js` only imports `createApp.js` and `db.js` — this is safe, but add a lint rule to prevent accidental imports. |
| **Risk** | 🟢 Low (not actively used on Vercel, but adds bundle weight if accidentally imported) |

---

## 2. `src/realtime/io.js` — Socket.io Room Helpers

| Field | Value |
|-------|-------|
| **File** | `backend/src/realtime/io.js` |
| **Issue** | Module exports `emitTo()`, `roomUser()`, `roomRide()`, `roomDrivers()`. These are Socket.io helper functions. Socket.io does not work on Vercel serverless (no WebSocket persistence). Although `io.js` itself doesn't import socket.io, it's a dead codepath. |
| **Impact** | Functions like `emitTo()` are called from `src/jobs/simulateMovement.js:45` and potentially from routes. On Vercel, `_io` will always be `null` so `emitTo()` is a no-op — the app loses real-time. |
| **Fix** | Replace Socket.io emit calls with database writes + polling endpoints. The routes that call `emitTo()` must instead write to a MongoDB collection that the client polls. |
| **Risk** | 🔴 High (real-time features are broken on Vercel — rides, chat, location, notifications all affected) |

---

## 3. `src/jobs/simulateMovement.js` — `setInterval` + `emitTo`

| Field | Value |
|-------|-------|
| **File** | `backend/src/jobs/simulateMovement.js` |
| **Issue** | Uses `setInterval()` (from `src/index.js:133`) to run driver movement simulation every 4 seconds. This is a long-running background process. Vercel serverless functions have a maximum lifetime of 10s (Hobby) or 30s (Pro) — they cannot host persistent intervals. |
| **Impact** | If `simulateMovement.js` is ever invoked on Vercel, it will time out after the function's max duration. |
| **Fix** | Guard simulation behind `if (process.env.VERCEL) return` in `index.js:132` (already done — simulation is behind `SIMULATION_ENABLED` env var). Ensure the simulation module is not imported on Vercel. |
| **Risk** | 🟢 Low (script is guarded by env var, not imported from `api/index.js`) |

---

## 4. `src/routes/uploads.js` — `multer.diskStorage` Local Filesystem

| Field | Value |
|-------|-------|
| **File** | `backend/src/routes/uploads.js:18-33` |
| **Issue** | Uses `multer.diskStorage` to write uploaded files to the local filesystem. On Vercel, the only writable directory is `/tmp` (512MB, ephemeral). Files written to `/tmp` are lost on cold start and not shared across instances. |
| **Impact** | Uploaded images are lost on every Vercel cold start (frequent on Hobby tier due to idle spin-down). Users will upload profile pictures that disappear minutes later. |
| **Fix** | Replace `multer.diskStorage` with `multer.memoryStorage` and upload to Cloudinary directly from the serverless function, or implement client-side direct upload to Cloudinary (preferred — avoids 10s Vercel timeout). |
| **Risk** | 🔴 High (data loss on every cold start) |

---

## 5. `src/routes/uploads.js` — Returns Local File Path

| Field | Value |
|-------|-------|
| **File** | `backend/src/routes/uploads.js:56` |
| **Issue** | Response includes `path: req.file.path` — exposing the server's local filesystem path in the API response. On Vercel this would leak `/tmp/weret-uploads/...` paths. |
| **Impact** | Information disclosure (minor). The `path` field is internal but returned to the client. |
| **Fix** | Remove `path` from the response body. The `url` field is sufficient for clients to access the file. |
| **Risk** | 🟢 Low (information disclosure, not exploitable) |

---

## 6. `src/middleware/rateLimiters.js` — No-op on Vercel

| Field | Value |
|-------|-------|
| **File** | `backend/src/middleware/rateLimiters.js:9-17` |
| **Issue** | Rate limiter explicitly short-circuits on Vercel: `onVercel ? (_req, _res, next) => next()`. `express-rate-limit` uses in-memory storage which doesn't work across serverless instances (each invocation is a separate process). |
| **Impact** | No rate limiting on Vercel. API is unprotected against DDoS or brute-force attacks. |
| **Fix** | Implement Vercel-compatible rate limiting using a MongoDB counter with TTL (write attempt to a `rate_limits` collection with TTL index). Or use Vercel Edge Middleware for IP-based rate limiting. |
| **Risk** | 🔴 High (no DDoS protection in production) |

---

## 7. `src/uploadPaths.js` — Vercel `/tmp` Fallback

| Field | Value |
|-------|-------|
| **File** | `backend/src/uploadPaths.js:10-12` |
| **Issue** | On Vercel, upload root is set to `/tmp/weret-uploads`. The `/tmp` directory is ephemeral (512MB limit, lost on cold start). While this is the **correct** behavior for Vercel (it's the only writable path), any file stored here will be lost when the function idles out (~5-15 min of inactivity). |
| **Impact** | Files served via `/uploads/public` and `/uploads/private` will 404 after a cold start. |
| **Fix** | Migrate to Cloudinary for all file storage. The local filesystem path should only serve as a fallback. On Vercel, all uploads must go to Cloudinary (client-side direct upload, bypassing Vercel entirely). |
| **Risk** | 🔴 High (data loss, broken profile images) |

---

## 8. `src/createApp.js:99` — `express.static` for Uploads

| Field | Value |
|-------|-------|
| **File** | `backend/src/createApp.js:96-100` |
| **Issue** | Serves `/uploads/public` as static files via `express.static`. On Vercel, the upload root is `/tmp/weret-uploads/public` — files here are ephemeral and the `/tmp` directory may not be accessible via `express.static` on serverless. |
| **Impact** | Public upload URLs will 404 on Vercel after cold start. |
| **Fix** | Route all file access through Cloudinary URLs. Remove `express.static` for upload directories. Restrict the static file serving to the admin web UI only. |
| **Risk** | 🔴 High (broken image URLs) |

---

## 9. `src/createApp.js:102-118` — Private File Serving via `res.sendFile`

| Field | Value |
|-------|-------|
| **File** | `backend/src/createApp.js:102-118` |
| **Issue** | `GET /uploads/private/:userId/:file` reads from local disk via `res.sendFile()`. On Vercel, the file will not exist after a cold start. |
| **Impact** | Private uploads (profile pictures, document scans) are inaccessible after cold start. |
| **Fix** | Use Cloudinary private URLs with signed expiry instead of local file serving. Remove the `sendFile` route entirely once Cloudinary is implemented. |
| **Risk** | 🔴 High (private files inaccessible) |

---

## 10. `src/createApp.js:124-135` — Admin UI Served Through Serverless Function

| Field | Value |
|-------|-------|
| **File** | `backend/src/createApp.js:124-135` |
| **Issue** | Admin web static files (`apps/web/`) are served through Express static middleware. On Vercel, the rewrite rule (`vercel.json:12`) sends all requests (`/(.*)`) to `api/index.js`, meaning admin static files are served through the serverless function — adding cold start latency to every static asset request. |
| **Impact** | Admin UI loads slowly on first request (cold start ~1-3s for every asset: HTML, JS, CSS, favicon). |
| **Fix** | Add explicit Vercel route rules in `vercel.json` to serve `admin-ui/*` as static assets directly by Vercel's CDN, bypassing the serverless function. |
| **Risk** | 🟡 Medium (performance, not reliability) |

---

## 11. `vercel.json:8` — `maxDuration: 30` Exceeds Hobby Limit

| Field | Value |
|-------|-------|
| **File** | `backend/vercel.json:8` |
| **Issue** | `"maxDuration": 30` is declared for the `api/index.js` function. Vercel Hobby tier has a **10-second maximum**. On Hobby, this setting is simply ignored (silently capped at 10s). On Pro it would allow 30s, but this configuration is misleading. |
| **Impact** | Any operation taking >10s will timeout with a 504. This affects admin stats, aggregation queries, and large uploads. |
| **Fix** | Change to `"maxDuration": 10` (the Hobby limit) to accurately reflect the deployment environment. Ensure all queries complete within 8s to leave buffer. |
| **Risk** | 🟡 Medium (misleading config, silent timeouts) |

---

## 12. `src/mongo/client.js:140` — `mongodb-memory-server` Dynamic Import

| Field | Value |
|-------|-------|
| **File** | `backend/src/mongo/client.js:140` |
| **Issue** | `await import("mongodb-memory-server")` is dynamically imported for in-memory MongoDB. This package is ~100MB+ and contains a MongoDB binary. While the dynamic import means it won't block the initial bundle, it's still present in `node_modules/` and could be accidentally invoked. |
| **Impact** | If `MONGODB_FALLBACK_MEMORY=1` is ever set on Vercel (e.g., from a stale `.env`), the function will attempt to download/start a MongoDB binary — this will fail (no write permission for binaries) or exceed the 10s timeout. |
| **Fix** | Add `if (process.env.VERCEL) throw new Error("In-memory MongoDB not available on Vercel")` guard in `connectToMemory()`. Or remove `mongodb-memory-server` from production dependencies. |
| **Risk** | 🟡 Medium (fail-safe, but could cause cryptic timeout errors) |

---

## 13. `src/db.js:35` — `ensureMongoIndexes` on Every Cold Start

| Field | Value |
|-------|-------|
| **File** | `backend/src/db.js:35` |
| **Issue** | `ensureMongoIndexes(getDb)` runs `createIndex` on every cold start. While `createIndex` is idempotent (`CREATE IF NOT EXISTS` behavior in MongoDB 7.x), it adds 200-500ms to every cold start latency. |
| **Impact** | Every Vercel cold start (~3-5 minutes on Hobby tier) takes an extra ~500ms for index creation. |
| **Fix** | Extract index creation to a one-time script (`scripts/create-indexes.js`). Remove `ensureMongoIndexes` from the server init path. Only verify indexes exist (use `db.collection.indexes()` with a cached flag). |
| **Risk** | 🟡 Medium (performance degradation on every cold start) |

---

## 14. `src/db.js:61` — `initMongoCloud` Run on Every Startup

| Field | Value |
|-------|-------|
| **File** | `backend/src/db.js:61` |
| **Issue** | `initMongoCloud(getDb, ...)` writes schema metadata to the `_meta` collection on every cold start (upsert). Redundant write on every serverless invocation. |
| **Impact** | Wastes ~100ms on every cold start. Unnecessary write operations on the shared M0 cluster. |
| **Fix** | Call `initMongoCloud` only once (via a setup script), not on every server start. Remove from `runSeeds()`. |
| **Risk** | 🟢 Low (performance, not correctness) |

---

## 15. `src/loadEnv.js` — Dotenv Load on Vercel

| Field | Value |
|-------|-------|
| **File** | `backend/src/loadEnv.js:8` |
| **Issue** | `dotenv.config({ path: ... })` attempts to load `.env` from the filesystem. On Vercel, env vars are set in the dashboard — there is no `.env` file in the deployment. The `dotenv` call is harmless (silently no-ops if file not found) but wastes ~10ms on cold start. |
| **Impact** | Negligible. The file won't exist on Vercel. |
| **Fix** | Optional: skip `dotenv` loading when `process.env.VERCEL` is set. |
| **Risk** | 🟢 Low (no functional impact) |

---

## 16. `src/createApp.js:44` — CORS Wide Open

| Field | Value |
|-------|-------|
| **File** | `backend/src/createApp.js:44` |
| **Issue** | `app.use(cors())` with no options allows all origins (`Access-Control-Allow-Origin: *`). On Vercel with a custom domain, any website can make authenticated requests to the API (though JWT protects specific endpoints). |
| **Impact** | CORS policy is too permissive. While JWT prevents unauthorized access, open CORS exposes the API to cross-origin abuse such as CSRF on non-JWT endpoints or preflight abuse. |
| **Fix** | Restrict CORS to specific origins via `CORS_ORIGINS` env var (comma-separated list). Use `cors({ origin: parseOrigins(process.env.CORS_ORIGINS) })`. |
| **Risk** | 🟡 Medium (security hardening) |

---

## 17. `backend/vercel.json:12-13` — Rewrite All Traffic Through Function

| Field | Value |
|-------|-------|
| **File** | `backend/vercel.json:12-13` |
| **Issue** | `"rewrites": [{ "source": "/(.*)", "destination": "/api" }]` routes 100% of traffic through the serverless function. This includes static assets (admin UI HTML, JS, CSS, images), favicon, and API calls. Static assets should bypass the function. |
| **Impact** | Every admin UI page load triggers a cold start. Static assets that could be served directly by Vercel's CDN instead invoke the Node.js function, consuming function execution quota and bandwidth. |
| **Fix** | Add explicit route rules for static paths before the catch-all rewrite: `{ "source": "/admin-ui/(.*)", "destination": "/admin-ui/$1" }` with `"headers"` for cache control. Only route `/api/(.*)` to the serverless function. |
| **Risk** | 🟡 Medium (performance + function invocation quota on Hobby) |

---

## Compatibility Map

```
src/index.js              ❌ SERVER ONLY (http.createServer, server.listen, setInterval)
src/api/index.js          ✅ Vercel entry (exports async handler, lazy init)

src/createApp.js          ✅ Mostly compatible 
  ├─ express()            ✅
  ├─ helmet()             ✅
  ├─ cors()               ⚠️ Wide open — restrict to whitelist
  ├─ express.json()       ✅
  ├─ DB middleware        ⚠️ Runs on every request — optimize with cached flag
  ├─ /health              ✅
  ├─ globalApiLimiter     ❌ No-op on Vercel — replace with MongoDB-based limiter
  ├─ routes               ✅
  ├─ /uploads/public      ❌ express.static on ephemeral /tmp
  ├─ /uploads/private     ❌ res.sendFile on ephemeral /tmp
  ├─ /admin-ui static     ⚠️ Served through function — route at Vercel edge
  └─ errorHandler         ✅

src/mongo/client.js       ⚠️ Mostly compatible
  ├─ connectToMemory()    ❌ Guard against Vercel (100MB+ binary download)
  ├─ connectToAtlas()     ✅
  └─ connectToLocal()     ❌ Local MongoDB not available on Vercel

src/db.js                 ⚠️ Mostly compatible
  ├─ ensureDb()           ✅ Lazy init with promise caching
  ├─ ensureMongoIndexes() ⚠️ Runs on every cold start — extract to script
  ├─ initMongoCloud()     ⚠️ Runs on every cold start — extract to script
  └─ runSeeds()           ✅ Guards against Vercel for mock data

src/routes/uploads.js     ❌ Local filesystem upload — must migrate to Cloudinary

src/realtime/io.js        ❌ Dead code on Vercel (Socket.io helpers, _io always null)

src/jobs/simulateMovement.js  ❌ setInterval + emitTo (guarded, but dead)

src/middleware/rateLimiters.js  ❌ No-op on Vercel
```

## Recommended Fix Order

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | 🔴 Uploads via multer to `/tmp` (data loss) | Medium | Images lost on cold start |
| 2 | 🔴 Rate limiter no-op (no DDoS protection) | Medium | API unprotected |
| 3 | 🔴 Real-time via Socket.io (dead on Vercel) | Large | Rides/chat/location blind |
| 4 | 🟡 Admin UI through function (slow loads) | Small | UX degradation |
| 5 | 🟡 `maxDuration: 30` vs Hobby 10s limit | Trivial | Silent timeouts |
| 6 | 🟡 `ensureMongoIndexes` on cold start | Small | Extra 500ms latency |
| 7 | 🟡 CORS wide open | Trivial | Security hardening |
| 8 | 🟢 `mongodb-memory-server` guard | Trivial | Fail-safe |
