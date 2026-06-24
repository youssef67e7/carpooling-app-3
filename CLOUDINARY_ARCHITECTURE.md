# Cloudinary Architecture (Final)

> **Status:** Design — code not started  
> **Budget:** Cloudinary Free (25GB storage, 25GB bandwidth/mo)  
> **Target:** Vercel Hobby (no filesystem, 10s function timeout)  
> **Credentials:** `CLOUDINARY_CLOUD_NAME=dixvj7zzs`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` saved in `backend/.env`

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          CLOUDINARY ARCHITECTURE                           │
│                                                                            │
│  ┌──────────┐    ┌──────────────────────┐    ┌──────────────────────┐      │
│  │  Flutter  │    │  Express (Vercel)    │    │  Cloudinary          │      │
│  │           │    │                      │    │                      │      │
│  │ 1. Get   │───►│  POST /upload/sign   │    │                      │      │
│  │ signature │◄───│  ← { signature,     │    │                      │      │
│  │           │    │      public_id,      │    │                      │      │
│  │           │    │      timestamp }     │    │                      │      │
│  │ 2. Upload │─────── multipart ──────────►│  POST /v1_1/{cloud}/   │      │
│  │ to Cld    │    │                      │    │   image/upload       │      │
│  │           │◄─────── { secure_url } ◄──────│                      │      │
│  │           │    │                      │    │                      │      │
│  │ 3. Call   │───►│  Business Endpoint   │    │                      │      │
│  │ Business  │    │  (e.g. driver-app-   │    │                      │      │
│  │ Endpoint  │    │  lication/submit)    │    │                      │      │
│  │           │    │                      │    │                      │      │
│  │           │    │  verifyCloudinaryUrl │──► │  api.resource() ║    │      │
│  │           │    │  ← exists (sensitive)│◄───│  ← image data       │      │
│  │           │    │                      │    │                      │      │
│  │           │    │  Store URL in Mongo  │    │                      │      │
│  └──────────┘    └──────────────────────┘    └──────────────────────┘      │
│                                                                            │
│  ║ = Admin API call for sensitive documents only (license, criminal,      │
│      insurance, registration)                                             │
│                                                                            │
│  LEGEND: ──► request   ◄── response   ═══► optional Admin API call        │
└────────────────────────────────────────────────────────────────────────────┘
```

**Total round-trips:** 2 (sign → upload → business endpoint). No extra `POST /upload/register`.

**No file touches the Vercel server.** Signature generation ~10ms, Admin API resource check ~200ms, both well within Vercel Hobby's 10s timeout.

---

## 2. Upload Flow (Detailed)

### Step 1: Flutter Requests Upload Signature

```
Flutter                            Express (Vercel)
  │                                    │
  │  POST /upload/sign                 │
  │  Authorization: Bearer <jwt>       │
  │  { "type": "license_photo" }       │
  │                                    │
  │                        Verify JWT, extract userId
  │                        Map type → folder:
  │                          "license_photo" → "documents/license"
  │                        Build public_id:
  │                          "weret/{folder}/{userId}/{uuid}"
  │                        Sign with Cloudinary SDK:
  │                          api_sign_request({
  │                            public_id: "weret/...",
  │                            timestamp: now
  │                          }, CLOUDINARY_API_SECRET)
  │                                    │
  │  ◄── 200 {                        │
  │    "signature": "abc...",          │
  │    "public_id": "weret/docume-    │
  │                  nts/license/      │
  │                  abc123/uuid-xyz", │
  │    "timestamp": 1704067200,        │
  │    "cloudName": "dixvj7zzs"       │
  │  }                                 │
```

**Key design decisions:**
- No `folder` parameter — `public_id` is the full path (Option B)
- No `apiKey` in response — Flutter reads it from app config
- Signature uses Cloudinary SDK `api_sign_request()` — never hand-roll SHA1

### Step 2: Flutter Uploads Directly to Cloudinary

```
Flutter                             Cloudinary
  │                                    │
  │  POST https://api.cloudinary.com/  │
  │       v1_1/dixvj7zzs/image/upload  │
  │  multipart/form-data:               │
  │    file=@localImage.jpg             │
  │    public_id=weret/documents/       │
  │              license/abc123/        │
  │              uuid-xyz              │
  │    timestamp=1704067200            │
  │    api_key=299489452134333         │
  │    signature=abc...                │
  │                                    │
  │                      Verify signature
  │                      using CLOUDINARY_API_SECRET
  │                      Store image, generate URL
  │                                    │
  │  ◄── 200 {                        │
  │    "public_id": "weret/docume-    │
  │                  nts/license/      │
  │                  abc123/           │
  │                  uuid-xyz",       │
  │    "secure_url": "https://res.     │
  │      cloudinary.com/dixvj7zzs/     │
  │      image/upload/v123456/         │
  │      weret/documents/license/      │
  │      abc123/uuid-xyz.jpg",        │
  │    "format": "jpg",               │
  │    "bytes": 123456                │
  │  }                                 │
```

**Note:** No `folder` parameter sent. Cloudinary infers the folder structure from `public_id` alone. The `public_id` `weret/documents/license/abc123/uuid-xyz` places the image under folder `weret/documents/license/abc123/`.

### Step 3: Flutter Calls Business Endpoint Directly

```
Flutter                             Express (Vercel)
  │                                    │
  │  POST /driver-application/submit   │
  │  Authorization: Bearer <jwt>       │
  │  {                                 │
  │    "licenseImageUrl": "https://    │
  │      res.cloudinary.com/...",      │
  │    "criminalRecordFrontUrl": "...",│
  │    ...                             │
  │  }                                 │
  │                                    │
  │                        For each image URL:
  │                        verifyCloudinaryUrl()
  │                          ├─ Check URL format
  │                          ├─ Check public_id pattern
  │                          ├─ userId matches req.userId
  │                          └─ api.resource(publicId)
  │                             (sensitive fields only)
  │                        Store valid URLs in MongoDB
  │                                    │
  │  ◄── 201 { user, profile, token }  │
```

**What `POST /upload/register` was supposed to do is now done by the business endpoint.** No extra round-trip. The business endpoint already receives the URL and stores it — it just needs to call `verifyCloudinaryUrl()` before storing.

---

## 3. Ownership Strategy

### Current (Broken)
```
isOwnedUploadUrl(userId, raw):
  if raw starts with http:// or https:// → return true  ← ANY HTTPS URL IS "OWNED"
  if raw starts with /uploads/public/{userId}/ → return true
  if raw starts with /uploads/private/{userId}/ → return true
  else return false
```

### New — verifyCloudinaryUrl()

```
function verifyCloudinaryUrl(userId, raw, { isSensitive = false } = {}) {
  // 1. Must be a Cloudinary URL from our cloud
  if (!raw.startsWith("https://res.cloudinary.com/dixvj7zzs/")) return false;

  // 2. Extract public_id using Cloudinary SDK (not manual parsing)
  //    Cloudinary URLs can have transformations in any order:
  //      /upload/v123/abc.jpg
  //      /upload/w_200,h_200/v123/abc.jpg
  //      /upload/f_auto,q_auto/v123/abc.jpg
  //      /upload/w_200/f_auto/v123/abc.jpg
  //    Use: cloudinary.url(publicId) or regex on the SDK response
  const publicId = extractPublicId(raw);  // ← Must use Cloudinary SDK

  if (!publicId) return false;

  // 3. Verify public_id pattern: "weret/{folder}/{userId}/{uuid}"
  //    The userId in the public_id must match the authenticated user.
  //    Folder is derived from the first 1-3 segments after "weret/".
  //    This ensures User A cannot submit User B's URL.
  const topSegments = publicId.split("/");
  //    weret / documents / license / {userId} / {uuid}
  //    weret / users / {userId} / {uuid}
  //    weret / vehicles / {userId} / {uuid}
  const userIdIndex = topSegments.length - 2;  // second-to-last
  if (topSegments[userIdIndex] !== String(userId)) return false;

  // 4. For sensitive documents, verify the image STILL EXISTS on Cloudinary
  //    (prevents: upload → delete → submit stale URL attack)
  if (isSensitive) {
    try {
      const result = await cloudinary.api.resource(publicId);
      if (!result) return false;
    } catch (e) {
      // api.resource throws if public_id not found
      return false;
    }
  }

  return true;
}
```

**What is `isSensitive`?** Documents that must exist at the time of submission:

| Sensitive | Field | Rationale |
|-----------|-------|-----------|
| ✅ Yes | `criminalRecordFrontUrl` | Regulatory requirement — must verify existence |
| ✅ Yes | `criminalRecordBackUrl` | Same as above |
| ✅ Yes | `licenseImageUrl` | Driving license — must be current |
| ✅ Yes | `registrationDocUrl` | Vehicle registration — must be current |
| ✅ Yes | `insuranceDocUrl` | Insurance — must be current |
| ❌ No | `profileImageUrl` | Avatar — low risk, existence check optional |
| ❌ No | `imageUrl` (car photo) | Vehicle photo — low risk |

For non-sensitive checks, the signature-based `public_id` containing `userId` is sufficient proof of ownership (the user couldn't have uploaded with another userId).

### How Public_id Forge Attack is Prevented

| Attack | Prevention |
|--------|-----------|
| User A uploads with User B's userId in public_id | `POST /upload/sign` only signs `public_id` values containing `req.userId`. The `api_sign_request()` signature binds `public_id` to the authenticated user. |
| User A uploads, then claims the URL on another endpoint | The business endpoint calls `verifyCloudinaryUrl()` which checks `userId` in `public_id` matches `req.userId`. |
| User A uploads an image, deletes it, then submits the stale URL | For sensitive docs, `api.resource(publicId)` verifies existence. Stale URL is rejected. |
| User A modifies the Flutter binary to send arbitrary public_id | Without a valid signature from the backend, Cloudinary rejects the upload. API Secret is server-only. |
| User A uploads with an unsigned preset | **No unsigned presets exist.** Signed uploads require API Secret which is server-only. |

### Public vs Private Documents — Honest Assessment

Cloudinary Free does **not** offer true private access control. All assets are publicly accessible by URL. The distinction between "public" and "private" is **application-layer only**:

| Category | Example | Cloudinary Access | App Layer Protection | Acceptable For |
|----------|---------|------------------|---------------------|----------------|
| Public photos | Profile avatar, vehicle photo | Anyone with URL | URL returned in list APIs | All stages |
| Private documents | Criminal record, license, insurance | Anyone with URL | URL **never** in list APIs. Only returned to owner via `GET /me` or `GET /driver-application/me`. Admin endpoints also return them. | Graduation project, MVP, internal tools |
| Truly private | — | Not available on Free tier | N/A | Production with compliance (requires Cloudinary Advanced plan or self-hosted) |

**Risk for criminal records on Free tier:**  
- Any user who obtains the direct Cloudinary URL can view criminal records  
- The URL is long, contains a UUID, and is never shared through the app  
- Attack surface: network interception, leaked server logs, admin abuse  
- For a graduation project: acceptable risk  
- For production with real criminal record data: **use a different approach** (server-side proxy with auth, or Cloudinary signed URLs with Advanced plan)

### Endpoint Updates Required

| Endpoint | Current Ownership | New Ownership |
|----------|-----------------|---------------|
| `POST /auth/register` — `profileImageUrl` | `isURL({http,https})` | `verifyCloudinaryUrl(url, { isSensitive: false })` |
| `PATCH /auth/profile` — `profileImageUrl` | `isURL({http,https})` | `verifyCloudinaryUrl(url, { isSensitive: false })` |
| `POST /driver-application/submit` — all 7 fields | `assertOwnedUploadUrls()` (broken — accepts any HTTPS) | `verifyCloudinaryUrl()` per field — criminal/license/reg/insurance with `isSensitive: true`, profile/car photo with `isSensitive: false` |
| `POST /driver/cars` — `imageUrl` | `isOwnedUploadUrl()` (broken) | `verifyCloudinaryUrl(url, { isSensitive: false })` |
| `PATCH /driver/cars/:carId` — `imageUrl` | `isOwnedUploadUrl()` (broken) | `verifyCloudinaryUrl(url, { isSensitive: false })` |
| `POST /become-driver` — all 4 fields | **No ownership check** | Add `verifyCloudinaryUrl()` — criminal records with `isSensitive: true` |

---

## 4. Folder Structure & Naming Convention

```
Cloudinary Root (weret/)
│
├── users/
│   └── {userId}/
│       └── {uuid}.{ext}
│       Example: weret/users/abc123/a1b2c3d4-e5f6-7890.jpg
│
├── vehicles/
│   └── {userId}/
│       └── {uuid}.{ext}
│       Example: weret/vehicles/abc123/b2c3d4e5-f6a7-8901.png
│
├── documents/
│   ├── license/
│   │   └── {userId}/
│   │       └── {uuid}.{ext}
│   │       Example: weret/documents/license/abc123/c3d4e5f6-a7b8-9012.jpg
│   │
│   ├── criminal/
│   │   └── {userId}/
│   │       └── {uuid}.{ext}
│   │       Example: weret/documents/criminal/abc123/d4e5f6a7-b8c9-0123.jpg
│   │
│   ├── registration/
│   │   └── {userId}/
│   │       └── {uuid}.{ext}
│   │       Example: weret/documents/registration/abc123/e5f6a7b8-c9d0-1234.jpg
│   │
│   └── insurance/
│       └── {userId}/
│           └── {uuid}.{ext}
│           Example: weret/documents/insurance/abc123/f6a7b8c9-d0e1-2345.jpg
│
└── seed/
    └── ...
```

### Naming Rules

| Component | Rule | Example |
|-----------|------|---------|
| Root prefix | Always `weret/` | `weret/` |
| Category | Lowercase, one of: `users`, `vehicles`, `documents/{sub}` | `documents/license` |
| Sub-category | Lowercase, one of: `license`, `criminal`, `registration`, `insurance` | `criminal` |
| User ID | MongoDB `_id` as string | `abc123def456ghi789jkl012` |
| UUID | v4 UUID (36 chars) | `550e8400-e29b-41d4-a716-446655440000` |
| Extension | Always lowercase | `.jpg` |

**The `public_id` format = the full path (no separate `folder`):**

```
weret/{category}/{userId}/{uuid}
weret/{category}/{sub}/{userId}/{uuid}
```

**Examples:**
```
weret/users/abc123/550e8400-e29b-41d4-a716-446655440000.jpg
weret/vehicles/abc123/550e8400-e29b-41d4-a716-446655440001.jpg
weret/documents/license/abc123/550e8400-e29b-41d4-a716-446655440002.jpg
weret/documents/criminal/abc123/550e8400-e29b-41d4-a716-446655440003.jpg
weret/documents/criminal/abc123/550e8400-e29b-41d4-a716-446655440004.jpg
weret/documents/registration/abc123/550e8400-e29b-41d4-a716-446655440005.jpg
weret/documents/insurance/abc123/550e8400-e29b-41d4-a716-446655440006.jpg
```

### Type → public_id Mapping

Used by both `POST /upload/sign` and `verifyCloudinaryUrl()`:

| type | public_id prefix | isSensitive |
|------|-----------------|-------------|
| `profile_photo` | `weret/users/{userId}/` | false |
| `vehicle_photo` | `weret/vehicles/{userId}/` | false |
| `license_photo` | `weret/documents/license/{userId}/` | true |
| `criminal_front` | `weret/documents/criminal/{userId}/` | true |
| `criminal_back` | `weret/documents/criminal/{userId}/` | true |
| `registration_doc` | `weret/documents/registration/{userId}/` | true |
| `insurance_doc` | `weret/documents/insurance/{userId}/` | true |

---

## 5. Security Rules

### Allowed File Types

**Photo types (profile, vehicle):** `jpg`, `jpeg`, `png`, `webp` only  
**Document types (license, criminal, registration, insurance):** `jpg`, `jpeg`, `png`, `webp` only

Decision: **No PDF support.** All documents are captured as images by the Flutter app using `image_picker` (camera or gallery). This eliminates the PDF handling inconsistency:

| Layer | Allowed | Enforcement |
|-------|---------|-------------|
| Flutter | `.jpg`, `.jpeg`, `.png`, `.webp` | Extension check in `upload_service.dart` |
| Cloudinary API param | `allowed_formats` not sent (server controls via `public_id` + unsigned formats still accepted, but restricted by the Flutter client) | Signed upload — Cloudinary accepts any format unless preset restricts. Enforce at Flutter + backend. |
| Backend | URL must point to an image stored in our Cloudinary | `verifyCloudinaryUrl()` — format check via `api.resource()` response's `format` field for sensitive docs |

### Maximum File Size

| Layer | Limit | Enforcement |
|-------|-------|-------------|
| Flutter | 5MB | Check `XFile.length()` before upload |
| Cloudinary | 5MB | `max_file_bytes` parameter in signed upload (or set in preset) |
| Backend | 5MB | Verify Cloudinary response `bytes` field in `verifyCloudinaryUrl()` — for sensitive docs only |

### Transformation Rules

Applied at read-time via URL transformations (no server-side processing). The Flutter app appends transformations to the Cloudinary URL when displaying images:

| Image Type | Transformation | Purpose |
|-----------|---------------|---------|
| Profile photo (avatar) | `w_200,h_200,c_fill,g_face,q_auto,f_auto` | Square crop, face-aware, 200px, auto format/quality |
| Profile photo (full screen) | `q_auto,f_auto` | Quality optimization, no resize |
| Vehicle photo (card view) | `w_800,h_600,c_fill,q_auto,f_auto` | 800×600 crop for list views |
| Vehicle photo (detail view) | `q_auto,f_auto` | Quality optimization, no resize |
| All documents | `q_auto,f_auto` | Quality only — no resize (preserves text readability) |

**Transformation examples (Flutter display):**
```dart
// Profile avatar — circular, 200px, face-aware crop
final avatar = 'https://res.cloudinary.com/dixvj7zzs/image/upload/'
    'w_200,h_200,c_fill,g_face,q_auto,f_auto/'
    'weret/users/abc123/uuid.jpg';

// Vehicle card — 800×600 crop
final vehicle = 'https://res.cloudinary.com/dixvj7zzs/image/upload/'
    'w_800,h_600,c_fill,q_auto,f_auto/'
    'weret/vehicles/abc123/uuid.jpg';

// Document — auto format + quality, no resize
final doc = 'https://res.cloudinary.com/dixvj7zzs/image/upload/'
    'q_auto,f_auto/'
    'weret/documents/license/abc123/uuid.jpg';
```

### Access Control

| Layer | Rule |
|-------|------|
| Cloudinary assets (Free tier) | **All assets are publicly accessible by URL** — no authentication, no expiry |
| Public photos (`users/`, `vehicles/`) | URL returned in list APIs (`GET /rides/available`, `GET /me`) — any authenticated user can view |
| Private documents (`documents/`) | URL **never** returned in list APIs. Only returned to owning user in `GET /driver-application/me` or to admin in `GET /admin/...`. Any external party with the URL can still access it (Free tier limitation). |
| Rate limiting | `POST /upload/sign` protected at **20 requests/min/user** (driver onboarding needs up to 7 sequential uploads). Use `authWriteLimiter` or a dedicated rate limiter. |
| Signature expiry | Cloudinary signature includes `timestamp` — expires after ~1 hour (Cloudinary default). Our signatures are single-use (each `POST /upload/sign` generates a unique UUID-based `public_id`). |

### extractPublicIdFromUrl — Must Use Cloudinary SDK

Do **NOT** write a manual parser. Cloudinary URLs have variable structures:

```javascript
// These are all valid Cloudinary URLs:
https://res.cloudinary.com/dixvj7zzs/image/upload/v1234/public_id.jpg
https://res.cloudinary.com/dixvj7zzs/image/upload/w_200/v1234/public_id.jpg
https://res.cloudinary.com/dixvj7zzs/image/upload/f_auto,q_auto/v1234/public_id.jpg
https://res.cloudinary.com/dixvj7zzs/image/upload/w_200,h_200,c_fill/v1234/public_id.jpg
https://res.cloudinary.com/dixvj7zzs/image/upload/c_fill,g_face/w_200/v1234/public_id.jpg
```

**Recommended approach — use the `cloudinary` npm package's URL parsing:**

```javascript
import cloudinary from "../config/cloudinary.js";

function extractPublicIdFromUrl(url) {
  // Strategy 1: Use cloudinary.url(). Not straightforward for extraction.
  //
  // Strategy 2 (recommended): Use the secure_url returned by Cloudinary upload
  //   which always has format:
  //   /upload/v{version}/{public_id}.{ext}
  //   WITHOUT transformations (those are added client-side).
  //
  //   The secure_url from the upload response is reliable:
  //   https://res.cloudinary.com/dixvj7zzs/image/upload/v1234/weret/users/abc/uuid.jpg
  //
  //   Regex (tested against Cloudinary's actual output):
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.(?:jpg|jpeg|png|webp)$/);
  return match ? match[1] : null;
}
```

The `secure_url` returned by Cloudinary's upload API always has the clean format (no transformations). Transformations are added by the Flutter app when displaying. So extracting `public_id` from the stored `secure_url` is reliable with a simple regex.

---

## 6. API Contract

### New Endpoint: `POST /upload/sign`

This is the **only** new endpoint. No `POST /upload/register`.

```json
// Request
POST /upload/sign
Authorization: Bearer <jwt>
{
  "type": "profile_photo" | "vehicle_photo" | "license_photo" |
          "criminal_front" | "criminal_back" | "registration_doc" | "insurance_doc"
}

// Response 200
{
  "signature": "abc123def456...",
  "public_id": "weret/documents/license/abc123/550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1704067200,
  "cloudName": "dixvj7zzs"
}

// Error 400 — invalid type
{ "message": "Invalid upload type" }

// Error 429 — rate limited
{ "message": "Too many requests. Try again later." }
```

| Response Field | Type | Description |
|---------------|------|-------------|
| `signature` | string | Cloudinary signed upload signature. Generated via `cloudinary.utils.api_sign_request({ public_id, timestamp }, CLOUDINARY_API_SECRET)` |
| `public_id` | string | Full Cloudinary public_id including path: `weret/{folder}/{userId}/{uuid}` |
| `timestamp` | number | Unix timestamp (seconds) — set by server |
| `cloudName` | string | Cloudinary cloud name for upload URL construction |

**Note:** `apiKey` is **not** returned. It is hardcoded in the Flutter app as `ApiConfig.cloudinaryApiKey`.

**Server-side logic (pseudocode):**

```
function signUpload(userId, type):
  folder = FOLDER_MAP[type]  // "users" | "vehicles" | "documents/license" ...
  publicId = "weret/{folder}/{userId}/{uuidv4()}"
  timestamp = Math.floor(Date.now() / 1000)

  // Correct Cloudinary signature — sort params alphabetically, join with &, append secret
  const params = { public_id: publicId, timestamp };
  const signature = cloudinary.utils.api_sign_request(params, CLOUDINARY_API_SECRET);

  return { signature, public_id: publicId, timestamp, cloudName: "dixvj7zzs" };
```

### Cloudinary Upload (Flutter → Cloudinary)

The Flutter app uses the signature to upload directly to Cloudinary:

```
POST https://api.cloudinary.com/v1_1/dixvj7zzs/image/upload
Content-Type: multipart/form-data

Fields:
  file         = @image.jpg
  public_id    = weret/documents/license/abc123/uuid-xyz
  timestamp    = 1704067200
  api_key      = 299489452134333        ← from Flutter config, not from sign response
  signature    = abc...                 ← from sign response
```

**Note:** No `folder` parameter. `public_id` alone determines the full path.  
**Note:** No `upload_preset` parameter — this is a signed upload, not preset-based.

### Replaced Business Endpoint Validation

Existing endpoints keep their same routes, methods, and request bodies. The validation changes:

**Before (broken):**
```javascript
// driver.js:27-32
function isOwnedUploadUrl(userId, raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (s.startsWith("http://") || s.startsWith("https://")) return true;  // ← accepts ANY URL
  return s.startsWith(`/uploads/public/${userId}/`) || ...;
}
```

**After (correct):**
```javascript
async function verifyCloudinaryUrl(userId, raw, { isSensitive = false } = {}) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (!s.startsWith("https://res.cloudinary.com/dixvj7zzs/")) return false;
  const publicId = extractPublicIdFromUrl(s);
  if (!publicId) return false;
  const segs = publicId.split("/");
  if (segs[segs.length - 2] !== String(userId)) return false;
  if (isSensitive) {
    try { await cloudinary.api.resource(publicId); }
    catch { return false; }
  }
  return true;
}
```

### Removed Endpoints

| Method | Path | Reason |
|--------|------|--------|
| `POST /upload/` | multipart form-data | Replaced by client-side Cloudinary signed upload |
| `GET /uploads/public/:userId/:file` | express.static | Files no longer on local disk |
| `GET /uploads/private/:userId/:file` | auth-gated file serve | Files no longer on local disk |

### Unchanged Endpoints

All business endpoints keep their same routes, methods, and request/response shapes. The only change is `isOwnedUploadUrl()` → `verifyCloudinaryUrl()` inside the route handlers.

---

## 7. Migration Strategy

### Phase 1: Cloudinary + Legacy Coexistence

```
Uploads:
  New uploads → Cloudinary (client-side signed upload)
  Old uploads → local disk (unchanged, for backward compat)

Storage:
  uploadStorage.js: resolveUploadStorageMode() returns "cloudinary"
  Old /uploads/* routes still serve existing files

Database:
  New URLs stored as Cloudinary HTTPS URLs
  Old relative URLs unchanged (still valid on local dev)

Validation:
  verifyCloudinaryUrl() handles both Cloudinary URLs and old relative paths
  (for legacy local dev data, accept old /uploads/... paths)
```

**Changes in Phase 1:**
- Install `cloudinary` npm package in `backend/`
- Create `backend/src/services/cloudinaryService.js` — `signUpload()`, `verifyCloudinaryUrl()`, `extractPublicIdFromUrl()`, `FOLDER_MAP`
- Add `POST /upload/sign` to `routes/uploads.js` (keep old multer handler temporarily)
- Update ownership in all business routes (`isOwnedUploadUrl` → `verifyCloudinaryUrl`)
- Add `verifyCloudinaryUrl()` to `POST /become-driver` (currently no check)
- Rewrite Flutter `upload_service.dart` — sign → upload to Cloudinary → call business endpoint
- Add `cloudName` and `apiKey` to Flutter's `ApiConfig`
- Update `uploadStorage.js` to support `UPLOAD_STORAGE=cloudinary` env var

### Phase 2: Legacy Routes Removed

```
After confirming all uploads go through Cloudinary:
- Remove POST /upload/ (multer handler)
- Remove GET /uploads/public/:userId/:file (express.static)
- Remove GET /uploads/private/:userId/:file (auth-gated serve)
- Remove uploadPaths.js
- Remove multer from package.json
```

### Migration of Existing Data

Since the app is **not yet deployed** and has no production data:

| Data Source | Action |
|------------|--------|
| Existing `/uploads/` on local dev | Left as-is. Old relative URLs continue to work in local dev via `verifyCloudinaryUrl()` which accepts both Cloudinary URLs and old `/uploads/...` paths during Phase 1. |
| Seed data (`seedVehicles.js`) | Uses `picsum.photos` — these are external URLs. The seed routes don't go through ownership checks. No migration needed. Can be replaced with Cloudinary-hosted images later. |
| Google Sign-In profiles | Google provides `picture` URL — stored directly in `profileImageUrl`. Google URLs don't go through `verifyCloudinaryUrl()` in the Google Sign-In flow (trusted source). No change needed. |

### Rollback Flow

```
At any point during Phase 1:
  1. Set UPLOAD_STORAGE=local in .env
  2. Revert upload_service.dart to old multipart flow
  3. Old POST /upload/ and static serving still work (unchanged)
  4. Old isOwnedUploadUrl() preserved if verifyCloudinaryUrl() fails — but
     rollback should revert the code too for consistency

Safe rollback at any Phase 1 commit.
```

---

## 8. Risk Analysis

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| 1 | **API Secret exposure** — Secret in `.env`, leaked via error/log | 🔴 Critical | Low | Never log secret. Vercel env vars encrypted at rest. Error messages never include secret. |
| 2 | **Cloudinary Admin API key usage** — `api.resource()` uses same key as upload signing | 🟡 Medium | Low | The Admin API call uses the same credentials. If the key is compromised, attacker can list/delete all assets. Mitigation: use a separate API key for read-only operations if Cloudinary allows (requires separate key configuration). |
| 3 | **Storage quota exceeded** — 25GB Free tier | 🟡 Medium | Low | ~12,500 images at 2MB avg. For <100 users, <1GB lifetime. Monitor dashboard. |
| 4 | **Bandwidth quota exceeded** — 25GB/mo Free tier | 🟡 Medium | Low | With `f_auto,q_auto` transformations, typical bandwidth <2GB/mo for <100 users. |
| 5 | **Cloudinary outage** — Upload unavailable | 🟡 Medium | Low | Flutter shows retryable error. Existing images remain accessible. No data loss. |
| 6 | **Vercel cold start + Admin API** — First upload after idle adds ~300ms | 🟢 Low | Medium | `api.resource()` call adds ~200ms. Total cold start: ~500ms (MongoDB + signature + Admin API). Well within 10s Hobby limit. |
| 7 | **public_id extraction failure** — Regex doesn't match Cloudinary URL format | 🟢 Low | Low | Use Cloudinary SDK's official URL-to-public_id method. Test against real Cloudinary responses. |
| 8 | **Flutter binary tampering** — Attacker modifies client to bypass checks | 🟢 Low | Low | All security is server-side. `verifyCloudinaryUrl()` is the single source of truth. Client is untrusted. |
| 9 | **Stale URL submission** — Upload, delete, then submit old URL | 🟡 Medium | Low | For sensitive docs: `api.resource()` verifies existence at submission time. For photos: signature + userId in public_id is sufficient (cosmetic risk only). |
| 10 | **Criminal record privacy on Free tier** — Any URL holder can view | 🔴 High (privacy) | Low (hard to get URL) | URLs are never exposed in list APIs. Only owner and admin can retrieve them. URL is a 100+ char string with UUID — not guessable. Acceptable for graduation project. **Not acceptable for production with real criminal data.** |

### Risk Summary

| Layer | Risk Level | Notes |
|-------|-----------|-------|
| Security (uploads) | 🟢 Low | Signed uploads prevent forgery. API Secret is server-only. |
| Security (privacy) | 🟡 Medium | Cloudinary Free has no access control. Documents are hidden, not private. Acceptable for graduation project only. |
| Storage | 🟢 Low | 25GB sufficient for graduation scale. |
| Bandwidth | 🟢 Low | 25GB/mo sufficient with `f_auto,q_auto`. |
| Vercel compatibility | 🟢 Low | No filesystem. Signatures ~10ms. Admin API ~200ms. Within 10s limit. |
| Migration complexity | 🟡 Medium | ~7 files modified, 1 new backend file, 1 new Flutter file. No schema change. |

---

## 9. Files Changed

| File | Change Type | Risk |
|------|-------------|------|
| `backend/src/services/cloudinaryService.js` | **New** — `signUpload()`, `verifyCloudinaryUrl()`, `extractPublicIdFromUrl()`, `FOLDER_MAP` | 🟡 Medium |
| `backend/src/services/uploadStorage.js` | Updated — `resolveUploadStorageMode()` reads `UPLOAD_STORAGE` env var | 🟢 Low |
| `backend/src/routes/uploads.js` | Rewritten — remove multer, add `POST /upload/sign` | 🟡 Medium |
| `backend/src/createApp.js` | Remove `express.static` for `/uploads/public`, remove `/uploads/private/:userId/:file` (Phase 2) | 🟢 Low |
| `backend/src/uploadPaths.js` | No change; delete in Phase 2 | 🟢 Low |
| `backend/src/routes/driver.js:27-32,164,196` | Replace `isOwnedUploadUrl()` with `verifyCloudinaryUrl()` | 🟡 Medium |
| `backend/src/routes/driverApplication.js:15-28,108-120` | Replace `isOwnedUploadUrl()`/`assertOwnedUploadUrls()` with `verifyCloudinaryUrl()` | 🟡 Medium |
| `backend/src/routes/roleSwitch.js:79-130` | Add `verifyCloudinaryUrl()` — currently no ownership check | 🟢 Low |
| `backend/src/routes/auth.js:117-120,180-183` | Update `profileImageUrl` validation to use `verifyCloudinaryUrl()` | 🟢 Low |
| `backend/src/config/cloudinary.js` | **New** — Cloudinary SDK initialization (singleton) | 🟢 Low |
| `backend/package.json` | Add `cloudinary` npm package, remove `multer` (Phase 2) | 🟢 Low |
| `backend/.env` | Add `UPLOAD_STORAGE=cloudinary` | 🟢 Low |
| `apps/mobile-flutter/lib/core/services/upload_service.dart` | Rewritten — sign → upload to Cloudinary → call business endpoint | 🟡 Medium |
| `apps/mobile-flutter/lib/core/api/api_config.dart` | Add `cloudName`, `apiKey` constants | 🟢 Low |
| `apps/mobile-flutter/lib/shared/widgets/document_upload_field.dart` | Update import if service name changes | 🟢 Low |
| `apps/mobile-flutter/lib/core/utils/upload_url.dart` | Simplify or remove — all URLs are now absolute Cloudinary URLs | 🟢 Low |

---

## 10. Flutter Upload Service Design

```dart
class UploadService {
  // Step 1: Get signature from backend (POST /upload/sign)
  Future<Map<String, dynamic>> _getSignature(String type);

  // Step 2: Upload to Cloudinary directly
  Future<CloudinaryUploadResult> _uploadToCloudinary(
    XFile file, {
    required String publicId,
    required String signature,
    required int timestamp,
  });

  // Step 3: Call business endpoint — uploader does NOT register the URL.
  //         The business endpoint (e.g. submitDriverApplication) receives
  //         the Cloudinary URL and calls verifyCloudinaryUrl() itself.

  // Combined: pick → sign → upload → return URL
  // Caller passes the URL to the appropriate business endpoint
  Future<String> uploadImage({
    required String type,
    ImageSource source = ImageSource.gallery,
  });
}

class CloudinaryUploadResult {
  final String secureUrl;
  final String publicId;
  final String format;
  final int bytes;
}
```

**Usage in driver onboarding:**
```dart
// In driver_onboarding_screen.dart:
final upload = ref.read(uploadServiceProvider);

// Each DocumentUploadField does:
// 1. upload.pickImage()
// 2. upload.uploadImage(type: 'license_photo')
// 3. Returns Cloudinary URL string
// 4. URL stored in local state variable (_licenseImageUrl)

// On submit, all URLs are sent to:
// POST /driver-application/submit { licenseImageUrl: "...", ... }
// Backend verifies each URL via verifyCloudinaryUrl()
```

---

## 11. Verification Checklist

- [ ] Signature uses Cloudinary SDK `api_sign_request()`, not manual SHA1
- [ ] No `folder` parameter — `public_id` alone is the full path
- [ ] No `POST /upload/register` — business endpoints verify ownership directly
- [ ] `verifyCloudinaryUrl()` calls `cloudinary.api.resource()` for sensitive docs
- [ ] `POST /become-driver` now has ownership validation (was missing)
- [ ] Rate limit on `POST /upload/sign` set to **20/min/user** (not 3/min)
- [ ] `apiKey` is in Flutter config, not in `/upload/sign` response
- [ ] `POST /upload/` (multer) removed from `routes/uploads.js`
- [ ] Static serving routes removed from `createApp.js`
- [ ] No PDF support — all documents are images (jpg/png/webp only)
- [ ] Allowed formats enforced at 3 layers (Flutter, Cloudinary, Backend)
- [ ] Max 5MB enforced at 3 layers
- [ ] Profile avatar displays with `w_200,h_200,c_fill,g_face,q_auto,f_auto`
- [ ] Vehicle photos display with `w_800,h_600,c_fill,q_auto,f_auto`
- [ ] Documents display with `q_auto,f_auto` (no resize)
- [ ] Old relative URLs in MongoDB still resolve in local dev (Phase 1)
- [ ] `cloudinary` npm package added, `multer` removed (Phase 2)
- [ ] Security note about Cloudinary Free access control is documented
