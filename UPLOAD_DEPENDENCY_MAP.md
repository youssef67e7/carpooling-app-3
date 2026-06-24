# Upload Dependency Map

> **Storage mode:** `local-disk` (hardcoded in `backend/src/services/uploadStorage.js:6`)  
> **System type:** Flutter picks from device → uploads to Express via multipart → saved to local disk → URL stored in MongoDB  
> **Vercel status:** `POST /upload/` stores to `/tmp/weret-uploads` (ephemeral — lost on cold start)

---

## 1. Endpoints That Accept Image Uploads (Direct File)

| # | Endpoint | File | Line | Method | Multer | Field | Validation |
|---|----------|------|------|--------|--------|-------|------------|
| 1 | `POST /upload/` | `routes/uploads.js` | 44 | Multipart file | `upload.single("image")` | `image` (form field) | `fileSize ≤ 5MB`, `files = 1`, MIME must be `image/*`; visibility defaults to `"public"` |

**Returns:** `{ url, visibility, mime, size, storage: "local", path }`  
**URL format:** `/uploads/{public|private}/{userId}/{filename}`  
**File naming:** `{timestamp}-{16hex}{ext}`  
**Auth:** `authRequired`, `blockCheck`

---

## 2. Endpoints That Store Image URLs (Not Files)

| # | Endpoint | File | Line | Method | Image Fields Accepted | Validation |
|---|----------|------|------|--------|----------------------|------------|
| 2 | `POST /auth/register` | `routes/auth.js` | 109 | JSON | `profileImageUrl` (optional) | `isURL({http,https})`, max 500 |
| 3 | `PATCH /auth/profile` | `routes/auth.js` | 174 | JSON | `profileImageUrl` (optional) | `isURL({http,https})`, max 500 |
| 4 | `POST /driver-application/submit` | `routes/driverApplication.js` | 59 | JSON | `profileImageUrl`, `criminalRecordFrontUrl`, `criminalRecordBackUrl`, `licenseImageUrl`, `carImageUrl`, `cars.*.imageUrl`, `cars.*.registrationDocUrl`, `cars.*.insuranceDocUrl` | `isString`, min 4, max 1000; **ownership check** via `assertOwnedUploadUrls()` at line 108 |
| 5 | `POST /driver/cars` | `routes/driver.js` | 139 | JSON | `imageUrl` | `isString`, min 4, max 500; **ownership check** via `isOwnedUploadUrl()` at line 164 |
| 6 | `PATCH /driver/cars/:carId` | `routes/driver.js` | 175 | JSON | `imageUrl` (optional) | `isString`, min 4, max 500; **ownership check** at line 196 |
| 7 | `POST /become-driver` | `routes/roleSwitch.js` | 79 | JSON | `profileImageUrl`, `criminalRecordFrontUrl`, `criminalRecordBackUrl`, `licenseImageUrl` (all optional) | `isString`, min 4, max 500; **no ownership check** |
| 8 | `POST /auth/google` | `routes/auth.js` | 70 | JSON | (none accepted — `profileImageUrl` set from Google token `picture` via `googleSignInUser.js`) | Google token verification only |

---

## 3. Image Fields & MongoDB Collections

| # | Field | Collection | Type | Max Len | Written By (Operation + File:Line) |
|---|-------|-----------|------|---------|-------------------------------------|
| 1 | `profileImageUrl` | `users` | String (URL) | 500 | `POST /auth/register` (auth.js:136), `PATCH /auth/profile` (auth.js:210), `POST /auth/phone/verify` (auth.js:303, empty), Google Sign-In (googleSignInUser.js:35,62,103), `POST /driver-application/submit` (driverApplication.js:129), `POST /become-driver` (roleSwitch.js:102) |
| 2 | `imageUrl` | `driver_profiles.cars[]` | String (URL) | 500 | `POST /driver/cars` (driver.js:156), `PATCH /driver/cars/:carId` (driver.js:193), `POST /driver-application/submit` (driverApplication.js:162,174) |
| 3 | `carImageUrl` | `driver_profiles` | String (URL) | 500 | `POST /driver-application/submit` (driverApplication.js:205 — mirror of first car's `imageUrl`) |
| 4 | `licenseImageUrl` | `driver_profiles` | String (URL) | 500 | `POST /driver-application/submit` (driverApplication.js:193) |
| 5 | `criminalRecordFrontUrl` | `driver_documents` | String (URL) | 500 | `POST /driver-application/submit` (driverApplication.js:143), `POST /become-driver` (roleSwitch.js:114) |
| 6 | `criminalRecordBackUrl` | `driver_documents` | String (URL) | 500 | `POST /driver-application/submit` (driverApplication.js:144), `POST /become-driver` (roleSwitch.js:115) |
| 7 | `registrationDocUrl` | `driver_profiles.cars[]` | String (URL) | 500 | `POST /driver-application/submit` (driverApplication.js:184) |
| 8 | `insuranceDocUrl` | `driver_profiles.cars[]` | String (URL) | 500 | `POST /driver-application/submit` (driverApplication.js:185) |
| 9 | `image` | `vehicles` | String (URL) | — | Seed data only (`seedVehicles.js:11,22,33,44,55,66` — picsum.photos) |
| 10 | `driverProposal.driverMeta.profileImageUrl` | `rides` | String (URL) | — | `POST /rides/offer` (rides.js:575 — copied from driver user at offer time) |
| 11 | `driverProposal.driverMeta.carImageUrl` | `rides` | String (URL) | — | `POST /rides/offer` (rides.js:576 — copied from selected car at offer time) |

---

## 4. Flutter Screens That Upload Images

| # | Screen | File | Widget | Image Types Uploaded | Upload Mechanism |
|---|--------|------|--------|---------------------|------------------|
| 1 | Driver Onboarding | `features/auth/driver_onboarding_screen.dart` | `DocumentUploadField` (x7 at lines 411-414, 466-468) | `profileImageUrl` (public), `licenseImageUrl`, `criminalRecordFrontUrl`, `criminalRecordBackUrl`, `carImageUrl` (public), `registrationDocUrl`, `insuranceDocUrl` | `UploadService.pickImage()` → `uploadImage()` → `POST /upload/` → stores URL → submitted via `POST /driver-application/submit` |
| 2 | Driver Cars (Add) | `features/more/driver_cars_screen.dart` | Inline form (line 41) | `imageUrl` (hardcoded placeholder — no real upload) | Sends `'https://placehold.co/400x240/png?text=Car'` directly (not a real upload) |

**Upload Service:** `core/services/upload_service.dart:13-27`  
**Shared Upload Widget:** `shared/widgets/document_upload_field.dart:31-47` — picks from gallery (`ImageSource.gallery`), resizes to 2048×2048, 85 quality, uploads as multipart

---

## 5. Flutter Screens That Display Images

| # | Screen | File | Line | Image Type | Display Method | Source |
|---|--------|------|------|-----------|---------------|--------|
| 1 | Driver Profile | `features/driver/driver_profile_screen.dart` | 34 | User avatar | `NetworkImage(user!.profileImageUrl)` | `authProvider.user.profileImageUrl` |
| 2 | Driver Home (Request Cards) | `features/auth/driver_home_screen.dart` | 374 | Passenger avatar | `NetworkImage(passengerImageUrl!)` | `passengerImageFromRide()` helper extracts from ride document's embedded `passengerId.profileImageUrl` |
| 3 | Driver Onboarding (via `DocumentUploadField`) | `features/auth/driver_onboarding_screen.dart` | 411-414, 466-468 | All 7 document types | `Image.network(resolved!)` in `document_upload_field.dart:92` | URL resolved via `UploadUrl.resolve()` which prefixes `ApiConfig.baseUrl` for relative paths |

**URL Resolution Helper:** `core/utils/upload_url.dart:7-13` — converts relative `/uploads/...` paths to absolute URLs using `ApiConfig.baseUrl`

---

## 6. Validation Rules

| # | Location | Field(s) | Rule |
|---|----------|---------|------|
| V1 | `routes/uploads.js:37-41` | Uploaded file | `fileSize ≤ 5MB`, MIME must start with `"image/"`, exactly 1 file |
| V2 | `routes/auth.js:117-120` | `profileImageUrl` (register) | Optional, `isURL({http,https})`, max 500 chars |
| V3 | `routes/auth.js:180-183` | `profileImageUrl` (profile) | Optional, `isURL({http,https})`, max 500 chars |
| V4 | `routes/driver.js:141` | `imageUrl` (add car) | Required, `isString`, min 4, max 500 |
| V5 | `routes/driver.js:177` | `imageUrl` (update car) | Optional, `isString`, min 4, max 500 |
| V6 | `routes/driverApplication.js:64-90` | All 7+ image fields (submit) | Required: `profileImageUrl`, `criminalRecordFrontUrl`, `criminalRecordBackUrl`, `licenseImageUrl`, `cars.*.imageUrl` — all `isString`, min 4, max 1000. Optional: `carImageUrl`, `cars.*.registrationDocUrl`, `cars.*.insuranceDocUrl` |
| V7 | `routes/roleSwitch.js:81-85` | All 4 image fields (become-driver) | Optional, `isString`, min 4, max 500 |
| V8 | `routes/uploads.js:13-16` | `visibility` | Normalized to `"public"` or `"private"` |

---

## 7. Image Ownership Checks

| # | Location | Function | Line | What It Validates |
|---|----------|---------|------|-------------------|
| O1 | `routes/driver.js` | `isOwnedUploadUrl(userId, raw)` | 27-32 | URL must start with `http://`, `https://`, `/uploads/public/{userId}/`, or `/uploads/private/{userId}/` |
| O2 | `routes/driverApplication.js` | `isOwnedUploadUrl(userId, raw)` | 15-21 | Same logic as O1 (duplicate function) |
| O3 | `routes/driverApplication.js` | `assertOwnedUploadUrls(userId, urls)` | 23-28 | Calls O2 on each URL in array, throws 400 if any fail |
| O4 | `routes/driver.js:164` | Inline call | 164 | `if (!isOwnedUploadUrl(req.userId, car.imageUrl)) throw ...` — in `POST /driver/cars` |
| O5 | `routes/driver.js:196` | Inline call | 196 | `if (req.body.imageUrl != null && !isOwnedUploadUrl(req.userId, car.imageUrl)) throw ...` — in `PATCH /driver/cars/:carId` |
| O6 | `routes/driverApplication.js:108-120` | `assertOwnedUploadUrls()` | 108-120 | Batch check of `profileImageUrl`, `criminalRecordFrontUrl`, `criminalRecordBackUrl`, `licenseImageUrl`, `carImageUrl`, and each `cars[*].imageUrl` — in `POST /driver-application/submit` |
| O7 | `routes/uploads.js` (private serving) | Path ownership in `createApp.js` | 102-118 | `GET /uploads/private/:userId/:file` — requires `req.userId === uid` or admin role; path-traversal protection |

**Gap:** `POST /become-driver` (roleSwitch.js:79-130) accepts image URLs but performs **no ownership check** — any user could submit another user's upload URL.

---

## 8. Complete Dependency Table

| Endpoint (File:Line) | Controller | Model/Collection | Mongo Field(s) | Flutter Screen(s) | Risk |
|----------------------|-----------|-----------------|----------------|-------------------|------|
| `POST /upload/` (uploads.js:44) | Inline | (file system) | (none — disk storage) | `driver_onboarding_screen.dart:411-414,466-468` | 🟡 Vercel: `/tmp` ephemeral |
| `POST /auth/register` (auth.js:109) | Inline | `users` | `profileImageUrl` | `driver_onboarding_screen.dart` (register + submit flow) | 🟢 |
| `PATCH /auth/profile` (auth.js:174) | Inline | `users` | `profileImageUrl` | (not currently wired in Flutter) | 🟢 |
| `POST /auth/google` (auth.js:70) | `upsertUserFromGoogleSignIn` | `users` | `profileImageUrl` | Google Sign-In flow (not a specific screen) | 🟢 |
| `POST /auth/phone/verify` (auth.js:260) | Inline | `users` | `profileImageUrl` (empty) | Phone OTP login flow | 🟢 |
| `POST /driver-application/submit` (driverApplication.js:59) | Inline | `users`, `driver_profiles`, `driver_documents` | `profileImageUrl`, `licenseImageUrl`, `carImageUrl`, `criminalRecordFrontUrl`, `criminalRecordBackUrl`, `cars.*.imageUrl`, `cars.*.registrationDocUrl`, `cars.*.insuranceDocUrl` | `driver_onboarding_screen.dart` (all 7 fields) | 🟡 Ownership check present but uses external URLs as trusted |
| `POST /driver/cars` (driver.js:139) | Inline | `driver_profiles.cars[]` | `imageUrl` | `driver_cars_screen.dart` (placeholder only — not wired) | 🟡 Ownership check present but placeholder URL |
| `PATCH /driver/cars/:carId` (driver.js:175) | Inline | `driver_profiles.cars[]` | `imageUrl` | (not wired in Flutter) | 🟡 Ownership check present |
| `POST /become-driver` (roleSwitch.js:79) | Inline | `users`, `driver_documents` | `profileImageUrl`, `criminalRecordFrontUrl`, `criminalRecordBackUrl` | (legacy — superseded by full onboarding) | 🔴 **No ownership check** |
| `GET /uploads/private/:userId/:file` (createApp.js:102) | Inline | (file system) | (none — disk read) | `document_upload_field.dart` (via `UploadUrl.resolve`) | 🟢 Auth-gated |
| `GET /uploads/public/:userId/:file` (createApp.js:97) | Express static | (file system) | (none — disk read) | `document_upload_field.dart` (via `UploadUrl.resolve`) | 🟢 Public |
| `POST /rides/offer` (rides.js:560) | Inline | `rides` | `driverProposal.driverMeta.profileImageUrl`, `driverProposal.driverMeta.carImageUrl` | `driver_home_screen.dart` (passenger avatar on request cards) | 🟢 Snapshot at offer time |
| Admin ride listing (admin.js:400-411) | Inline | `rides` + populated `users` | `profileImageUrl` (via `.populate`) | Admin web UI | 🟢 |

---

## 9. Risk Summary

| Risk | Location | Description |
|------|----------|-------------|
| 🔴 High | `POST /become-driver` (`roleSwitch.js:79`) | Accepts image URLs with **no ownership validation** — any user ID's upload URL can be referenced |
| 🔴 High | `POST /driver-application/submit` (`driverApplication.js:108`) | Ownership check allows **any external HTTPS URL** (`isOwnedUploadUrl` returns `true` for all `http://`/`https://` URLs) — effectively bypassing ownership for external images |
| 🟡 Medium | `POST /upload/` (`uploads.js`) | Only local disk storage — **non-functional on Vercel** (files stored in `/tmp` are ephemeral, lost on cold start) |
| 🟡 Medium | `POST /driver/cars` (`driver.js:139`) & `PATCH /driver/cars/:carId` (`driver.js:175`) | Same ownership weakness — accepts any HTTPS URL as owned |
| 🟡 Medium | `driver_cars_screen.dart:51` | Hardcoded placeholder `https://placehold.co/...` for car image — not a real upload flow |
| 🟢 Low | All registration/auth endpoints | `profileImageUrl` only accepted via HTTPS URL (Google or pre-uploaded) — no risk of file upload abuse |
| 🟢 Low | `PATCH /auth/profile` (`auth.js:174`) | Profile update not wired in Flutter UI — no real-world usage path through the app |
