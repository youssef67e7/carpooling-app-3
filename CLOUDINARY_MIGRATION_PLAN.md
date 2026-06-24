# Cloudinary Migration Plan

> **Goal:** Replace local filesystem uploads with Cloudinary direct upload for Vercel compatibility.
> **Status:** Planning phase — no code changes yet.
> **Cloudinary credentials:** Saved in `backend/.env` (`CLOUDINARY_CLOUD_NAME=dixvj7zzs`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

---

## Architecture Change

```
BEFORE (local disk, broken on Vercel):

  Flutter ──POST /upload (multipart)──► Express ──multer.diskStorage──► /tmp (ephemeral)
                                           │
                                           ▼
                                        URL /uploads/public/{uid}/{file}
                                           │
                                           ▼
                                        express.static or res.sendFile (lost on cold start)


AFTER (Cloudinary, Vercel-compatible):

  Flutter ──upload preset──► Cloudinary ──signed URL──► Flutter
                                                            │
                                                   POST /upload-url { cloudinaryUrl }
                                                            │
                                                            ▼
                                                         Express stores URL in MongoDB
                                                           (no file touches Vercel)
```

---

## Audit Results

### File 1: `backend/src/routes/uploads.js`

| Aspect | Current | Issue |
|--------|---------|-------|
| Import | `multer` from `multer` package | Direct dependency on local filesystem |
| Storage | `multer.diskStorage` writes to `userUploadDir()` on local disk | **Breaks on Vercel** — `/tmp` is ephemeral |
| File filter | `mimetype.startsWith("image/")` | Accepts any image MIME type (including SVG, BMP, TIFF) |
| Response | Returns `{ url, visibility, mime, size, storage: "local", path }` | Exposes server filesystem path; `storage: "local"` is inaccurate on Vercel |
| Endpoint | `POST /upload` accepts multipart with `image` field + `visibility` | Must become `POST /upload-url` accepting a JSON body with `cloudinaryUrl` |
| Auth | `authRequired + blockCheck` middleware | Preserve as-is |

### File 2: `backend/src/services/uploadStorage.js`

| Aspect | Current | Issue |
|--------|---------|-------|
| `resolveUploadStorageMode()` | Always returns `"local"` | Must support `"cloudinary"` based on env var |
| `useLocalFileStorage()` | Always returns `true` | Must return `false` when Cloudinary is active |
| `describeFileStorage()` | Always returns `"local-disk"` | Must return `"cloudinary"` when configured |

### File 3: `backend/src/multer configuration` (inside `uploads.js:18-42`)

| Aspect | Current | Issue |
|--------|---------|-------|
| Storage engine | `multer.diskStorage` with custom destination/filename | Entirely replaced — no file touches the server |
| File size limit | `5 * 1024 * 1024` (5MB) | Move to client-side enforcement (Cloudinary also enforces) |
| Allowed types | `image/*` (all image MIME types) | Restrict to `image/jpeg`, `image/png`, `image/webp` on both client and server |
| Filename generation | `Date.now()-{randomBytes(8).hex}{ext}` | Handled by Cloudinary (public_id) |

### File 4: Backend URL Validation (not in upload files, but affected)

| File | Function | Current Logic | Cloudinary Impact |
|------|----------|--------------|-------------------|
| `routes/driver.js:27-32` | `isOwnedUploadUrl()` | Accepts HTTP/HTTPS URLs and `/uploads/public/{uid}/...` or `/uploads/private/{uid}/...` | **Already compatible** — line 30 accepts any HTTP/HTTPS URL, which covers Cloudinary URLs |
| `routes/driverApplication.js:15-21` | `isOwnedUploadUrl()` | Same logic as above | **Already compatible** — line 18 accepts any HTTP/HTTPS URL |

### File 5: `backend/src/createApp.js` — Upload Serving Routes

| Aspect | Current | Issue |
|--------|---------|-------|
| `express.static` for `/uploads/public` | Serves public files from local disk | Remove entirely — Cloudinary serves files directly |
| `res.sendFile` for `/uploads/private/:userId/:file` | Reads private files from local disk | Remove entirely — Cloudinary signed URLs handle access control |

### File 6: Flutter `core/services/upload_service.dart`

| Aspect | Current | Required Change |
|--------|---------|-----------------|
| Upload flow | `pickImage()` → `uploadImage()` → multipart POST to API | `pickImage()` → upload directly to Cloudinary via `cloudinary_public` package or REST API → POST resulting URL to API |
| `uploadImage()` | Calls `api.postMultipart(ApiEndpoints.upload, formData)` | Upload to `https://api.cloudinary.com/v1_1/{cloud}/image/upload` with upload preset, then POST the returned URL to new `POST /upload-url` |

---

## Migration Steps

### Step 1: Cloudinary Configuration (Backend — no code)

| Action | Details |
|--------|---------|
| **Create upload preset** | In Cloudinary Dashboard → Settings → Upload → Add upload preset. Name: `weret_unsigned`. Type: Unsigned (for client uploads). Allowed formats: `jpg`, `png`, `webp`. Max file size: 5MB. |
| **Add env var** | Add `CLOUDINARY_UPLOAD_PRESET=weret_unsigned` to `backend/.env` (already has cloud name, API key, API secret) |
| **Verify credentials** | Test with: `curl https://api.cloudinary.com/v1_1/dixvj7zzs/image/upload` returns valid JSON |

### Step 2: Update `backend/src/services/uploadStorage.js`

| Change | Details |
|--------|---------|
| Add `UPLOAD_STORAGE` env var check | `resolveUploadStorageMode()` returns `process.env.UPLOAD_STORAGE || "local"` |
| `useLocalFileStorage()` | Returns `resolveUploadStorageMode() !== "cloudinary"` |
| `describeFileStorage()` | Returns the active storage mode string |

### Step 3: Add Cloudinary Server-Side Verification Endpoint

**New endpoint:** `POST /upload-url`

| Aspect | Design |
|--------|--------|
| **Purpose** | Receive a Cloudinary URL from the client, verify it exists, store in MongoDB |
| **Method** | `POST /upload-url` |
| **Auth** | `authRequired + blockCheck` (same as current) |
| **Request body** | `{ cloudinaryUrl: string, visibility: "public" \| "private", mime?: string, size?: number }` |
| **Response** | `{ url: string, cloudinaryUrl: string, visibility: string, storage: "cloudinary" }` |
| **Validation** | `cloudinaryUrl` must start with `https://res.cloudinary.com/dixvj7zzs/` |
| **Verification** | Optional: fetch the URL with `HEAD` to confirm it exists (skip for performance) |
| **Storage** | Store `cloudinaryUrl` + `userId` + `visibility` + `createdAt` in MongoDB `uploads` collection (for audit) |

**Example request:**
```json
POST /upload-url
Authorization: Bearer <jwt>
{
  "cloudinaryUrl": "https://res.cloudinary.com/dixvj7zzs/image/upload/v1234567890/profile/uuid123.jpg",
  "visibility": "public",
  "mime": "image/jpeg",
  "size": 234567
}
```

**Example response:**
```json
{
  "url": "https://res.cloudinary.com/dixvj7zzs/image/upload/v1234567890/profile/uuid123.jpg",
  "cloudinaryUrl": "https://res.cloudinary.com/dixvj7zzs/image/upload/v1234567890/profile/uuid123.jpg",
  "visibility": "public",
  "mime": "image/jpeg",
  "size": 234567,
  "storage": "cloudinary"
}
```

### Step 4: Remove Local Upload Code from Backend

| File | Change |
|------|--------|
| `routes/uploads.js` | Replace `multer` multipart handler with new `POST /upload-url` JSON handler. Remove `multer` import, `diskStorage`, `userUploadDir`. |
| `createApp.js:96-118` | Remove `express.static` for `/uploads/public`. Remove `/uploads/private/:userId/:file` route. |
| `uploadPaths.js` | Remove `getUploadRoot()`, `ensureUploadRoot()`, `userUploadDir()` — no longer called. Keep file for legacy compatibility reference, then delete in cleanup. |

### Step 5: Update Flutter Upload Service

| File | Change |
|------|--------|
| `lib/core/services/upload_service.dart` | Replace `uploadImage()` with two-step flow: (1) upload to Cloudinary via HTTP multipart to `https://api.cloudinary.com/v1_1/dixvj7zzs/image/upload` with `upload_preset=weret_unsigned` + `file` + `public_id` = `{userId}/{uuid}`, (2) POST `cloudinaryUrl` to `POST /upload-url`. |

**New Flutter upload flow:**
```dart
Future<String> uploadImage(XFile file, {String visibility = 'private'}) async {
  // Step 1: Upload to Cloudinary directly
  final cloudFormData = FormData.fromMap({
    'upload_preset': 'weret_unsigned',
    'file': await MultipartFile.fromFile(file.path, filename: file.name),
    'public_id': '${_getUserId()}/${DateTime.now().millisecondsSinceEpoch}',
  });
  final cloudRes = await Dio().post(
    'https://api.cloudinary.com/v1_1/dixvj7zzs/image/upload',
    data: cloudFormData,
  );
  final cloudinaryUrl = cloudRes.data['secure_url'] as String;

  // Step 2: Register URL with backend
  final api = await _ref.read(apiClientProvider.future);
  final data = await api.postJson('/upload-url', {
    'cloudinaryUrl': cloudinaryUrl,
    'visibility': visibility,
    'mime': cloudRes.data['format'],
    'size': cloudRes.data['bytes'],
  });

  return data['url'] as String;
}
```

### Step 6: Add `cloudinary_public` Flutter Package (Optional)

| Package | Purpose |
|---------|---------|
| `dio` (already present) | Can handle direct Cloudinary upload without additional package |
| `cloudinary_public` npm equivalent | Not needed — raw HTTP POST to Cloudinary REST API is simpler and avoids version conflicts |

Using `Dio` directly (already in the project) is preferred over adding a new Cloudinary Flutter SDK.

### Step 7: Enforce Image Type Restrictions

| Layer | Change |
|-------|--------|
| **Flutter client** | In `_pick()`, accept only `jpg`, `jpeg`, `png`, `webp` extensions. Reject others with a user-facing message. |
| **Cloudinary preset** | In Cloudinary Dashboard, set `Allowed formats: jpg, png, webp` on the upload preset. |
| **Backend verification** | In `POST /upload-url`, verify `mime` is `image/jpeg`, `image/png`, or `image/webp`. |
| **Max file size** | 5MB — enforced at three levels: Flutter client (before upload), Cloudinary preset (server-side), backend (when registering URL). |

---

## API Contract Changes

### Removed Endpoint

| Method | Path | Reason |
|--------|------|--------|
| `POST /upload` | multipart form-data | Replaced by client-side Cloudinary upload |

### New Endpoint

| Method | Path | Request | Response |
|--------|------|---------|----------|
| `POST /upload-url` | JSON `{ cloudinaryUrl, visibility, mime?, size? }` | `{ url, cloudinaryUrl, visibility, storage: "cloudinary" }` |

### Preserved Contracts

| Aspect | Status |
|--------|--------|
| Auth middleware (`authRequired + blockCheck`) | ✅ Same |
| Error response shape | ✅ Same (`AppError` → `errorHandler`) |
| All existing image URL validation | ✅ **Already compatible** — `isOwnedUploadUrl()` in `driver.js:30` and `driverApplication.js:18` accept any HTTP/HTTPS URL |
| Flutter `UploadUrl.resolve()` | ✅ Already handles absolute URLs (returns them as-is) |

---

## Files to Modify

| File | Change Type | Risk |
|------|-------------|------|
| `backend/src/routes/uploads.js` | Rewrite — replace multer with JSON handler | 🟡 Medium |
| `backend/src/services/uploadStorage.js` | Update — make mode configurable via env | 🟢 Low |
| `backend/src/createApp.js:96-118` | Remove static file serving for uploads | 🟢 Low |
| `backend/src/uploadPaths.js` | No change needed initially; delete in cleanup | 🟢 Low |
| `backend/.env` | Add `UPLOAD_STORAGE=cloudinary` + `CLOUDINARY_UPLOAD_PRESET` | 🟢 Low |
| `apps/mobile-flutter/lib/core/services/upload_service.dart` | Rewrite — two-step Cloudinary + API flow | 🟡 Medium |
| Cloudinary Dashboard (browser) | Create upload preset `weret_unsigned` | 🟢 Low |

---

## Rollback Plan

| Step | Rollback |
|------|----------|
| 1. Cloudinary upload preset | Delete preset (no code revert needed) |
| 2. `uploadStorage.js` | Revert `UPLOAD_STORAGE` env var to `local` |
| 3. `POST /upload-url` | Keep endpoint; revert `POST /upload` to multer handler |
| 4. `createApp.js` static routes | Revert to `express.static` + `res.sendFile` |
| 5. Flutter upload service | Revert to multipart POST to `POST /upload` |
| 6. Remove Cloudinary env vars | Delete from `.env` |

Rollback is safe at any step. Old and new flows can coexist by supporting both `POST /upload` and `POST /upload-url` during transition.

---

## Verification Checklist

- [ ] Cloudinary upload preset created (unsigned, jpg/png/webp, 5MB max)
- [ ] `POST /upload` removed; `POST /upload-url` added
- [ ] Flutter uploads image directly to `https://api.cloudinary.com/v1_1/dixvj7zzs/image/upload`
- [ ] Flutter sends Cloudinary URL to `POST /upload-url`
- [ ] Backend stores Cloudinary URL (no file on server)
- [ ] `express.static` upload routes removed from `createApp.js`
- [ ] `isOwnedUploadUrl()` accepts Cloudinary HTTPS URLs (already does)
- [ ] All existing driver profile, vehicle image, and document uploads still work
- [ ] `uploadStorage.js` reports `"cloudinary"` mode
- [ ] Old `/uploads/*` paths in existing MongoDB documents still resolve (via `UploadUrl.resolve()` which passes absolute URLs through)
- [ ] Max image size 5MB enforced at: Flutter client, Cloudinary preset, backend
- [ ] Only JPG, PNG, WEBP accepted at all three layers
- [ ] Vercel deployment no longer depends on `/tmp` for uploads
