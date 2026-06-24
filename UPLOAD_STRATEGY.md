# Phase 10 — Upload Strategy

## Current State (Broken)

```javascript
// Current approach: Multer writes to /tmp/
const upload = multer({ dest: '/tmp/' });

router.post('/profile-image', upload.single('image'), async (req, res) => {
  // File is in /tmp/ — Vercel may have already reclaimed it
  const result = await cloudinary.uploader.upload(req.file.path);
  // result.url may not be accessible if /tmp/ was cleaned
  res.json({ url: result.url });
});
```

**Problems:**
1. Vercel's `/tmp/` is ephemeral and may be garbage collected between function invocations
2. File passes through Vercel (wasted bandwidth, cold start delay)
3. Multer dependency unnecessary for the architecture
4. Large uploads risk hitting 10s function timeout

## Target: Direct Client-to-Cloudinary Upload

### Architecture
```
Flutter App ───► HTTP PUT ──► Cloudinary
                (signed upload preset)
                    │
                    ▼
           Cloudinary returns URL
                    │
                    ▼
           Flutter sends URL to API:
           POST /api/upload/profile-image { url: "..." }
                    │
                    ▼
           API stores URL in DB (no file handling)
```

### Cloudinary Configuration

**Upload Preset** (create in Cloudinary Dashboard):
- Name: `reachnative_profile_uploads`
- Type: `Signed` (authenticated) or `Unsigned` (public)
- Signing URL: Enabled for production
- Folder: `profiles/`
- Transformation: `w_400,h_400,c_fill,q_auto,f_webp`
- Allowed formats: `jpg`, `png`, `webp`
- Max size: 5MB

**For production, use Signed uploads:**
```dart
// Flutter — Generate signature server-side
Future<String> uploadToCloudinary(String imagePath) async {
  final timestamp = (DateTime.now().millisecondsSinceEpoch / 1000).round();
  final signature = await getSignatureFromApi(timestamp, publicId);
  
  final uri = Uri.parse(
    'https://api.cloudinary.com/v1_1/$cloudName/image/upload'
  );
  
  final request = http.MultipartRequest('POST', uri);
  request.fields['timestamp'] = timestamp.toString();
  request.fields['public_id'] = publicId;
  request.fields['signature'] = signature;
  request.fields['api_key'] = apiKey;
  request.fields['folder'] = 'profiles';
  request.fields['transformation'] = 'w_400,h_400,c_fill,q_auto,f_webp';
  request.files.add(await http.MultipartFile.fromPath('file', imagePath));
  
  final response = await request.send();
  final data = await response.stream.bytesToString();
  final json = jsonDecode(data);
  return json['secure_url'];
}
```

**Signature generation endpoint (API-side):**
```javascript
// POST /api/upload/signature
const cloudinary = require('cloudinary').v2;

router.post('/signature', authMiddleware, async (req, res) => {
  const { publicId } = req.body;
  const timestamp = Math.round(Date.now() / 1000);
  
  const signature = cloudinary.utils.api_sign_request({
    timestamp,
    public_id: publicId,
    folder: 'profiles',
  }, process.env.CLOUDINARY_API_SECRET);
  
  res.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});
```

### Flutter Upload Flow

```dart
// 1. Pick image (image_picker package)
final image = await _picker.pickImage(source: ImageSource.gallery);

// 2. Get Cloudinary signature
final sigResponse = await http.post(
  Uri.parse('$apiUrl/upload/signature'),
  headers: {'Authorization': 'Bearer $token'},
  body: jsonEncode({'publicId': 'user_${userId}_${timestamp}'}),
);
final sigData = jsonDecode(sigResponse.body);

// 3. Upload to Cloudinary
final cloudinaryUrl = await uploadToCloudinary(
  image.path,
  sigData['signature'],
  sigData['timestamp'],
  sigData['apiKey'],
  sigData['cloudName'],
);

// 4. Send URL to API
await http.put(
  Uri.parse('$apiUrl/users/profile'),
  headers: {'Authorization': 'Bearer $token'},
  body: jsonEncode({'avatar': cloudinaryUrl}),
);
```

### API Endpoint (Simplified)

```javascript
// POST /api/upload/profile-image — receive URL only
router.post('/profile-image', authMiddleware, async (req, res) => {
  const { url } = req.body;
  
  if (!url || !url.startsWith('https://res.cloudinary.com/')) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'Invalid Cloudinary URL' }
    });
  }
  
  await db.collection('users').updateOne(
    { _id: req.user._id },
    { $set: { avatar: url } }
  );
  
  res.json({ success: true, data: { url } });
});
```

### Security

| Measure | Implementation |
|---------|---------------|
| Signed uploads | Server generates signature; prevents abuse of upload preset |
| URL validation | API validates Cloudinary URL format before storing |
| Max file size | 5MB (enforced by Cloudinary preset) |
| Allowed formats | jpg, png, webp (enforced by Cloudinary preset) |
| Transformation | Server-side: w_400,h_400,c_fill,q_auto,f_webp (reduces storage) |
| Rate limit | 10 uploads/hour per user |
| Expiring URLs | Optionally use Cloudinary private assets with signed URLs (future) |

### Migration Steps

| Step | Detail |
|------|--------|
| 1 | Configure Cloudinary upload presets (signed) |
| 2 | Create `/api/upload/signature` endpoint |
| 3 | Implement Flutter direct upload to Cloudinary |
| 4 | Simplify `/api/upload/profile-image` to accept URL only |
| 5 | Remove `multer` dependency from `package.json` |
| 6 | Remove `routes/upload.js` old implementation |
| 7 | Test end-to-end (pick image → Cloudinary → store URL → display) |

### Admin Panel Upload

Admin panel must also use direct Cloudinary upload. For the simple HTML/JS admin:
- Use Cloudinary's unsigned upload widget (if admin origins are whitelisted)
- Or use the same signed flow with a separate API key

```javascript
// Admin upload widget (simpler)
// Include Cloudinary upload widget JS in admin HTML
const widget = cloudinary.createUploadWidget({
  cloudName: 'reachnative',
  uploadPreset: 'admin_uploads',  // separate preset
  folder: 'admin/',
}, (error, result) => {
  if (result.event === 'success') {
    document.getElementById('avatarUrl').value = result.info.secure_url;
  }
});
```

## Rollback Plan

If direct upload has issues:
1. Re-enable `multer` + server-side upload (broken on Vercel but works locally)
2. Or use Vercel Blob Storage as intermediary (paid feature)
3. Or return to old flow with `/tmp/` (not recommended — unreliable)

## Cost Impact

- Cloudinary free tier: 25GB storage, 25GB bandwidth/month — sufficient for profile images
- No additional Vercel bandwidth for uploads (client uploads directly)
- No function execution time for file processing
