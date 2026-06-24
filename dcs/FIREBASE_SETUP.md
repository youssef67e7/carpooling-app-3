# Firebase setup — project **youssef** (`youssef-f757e`)

| Setting | Value |
|---------|--------|
| Project ID | `youssef-f757e` |
| Project number | `557419979360` |
| Storage | `youssef-f757e.firebasestorage.app` |
| Realtime Database | `https://youssef-f757e-default-rtdb.firebaseio.com` |
| Android package | `com.example.ecommerce_app` |
| Support email | youssefsalah.100000@gmail.com |

## What WERET uses

| Service | Used for |
|---------|----------|
| **Firestore** | Users, rides, wallet, … (permanent cloud DB) |
| **Local disk** | Images/files in `backend/uploads/` (default, no Firebase Storage) |
| **Storage (cloud)** | Optional — only if `UPLOAD_STORAGE=firebase` |
| **Auth** | Firebase ID tokens (optional) + app JWT |
| **Realtime Database** | Linked in config; rules locked (`.read`/`.write`: false) — OK |

> RTDB rules `false/false` = clients cannot read/write directly. Backend Admin SDK bypasses rules.

## Backend (`backend/.env`)

1. Firebase Console → **Project settings → Service accounts** → Generate private key
2. Set:

```env
FIREBASE_PROJECT_ID=youssef-f757e
FIREBASE_STORAGE_BUCKET=youssef-f757e.firebasestorage.app
FIREBASE_DATABASE_URL=https://youssef-f757e-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

3. Enable in Console:
   - **Firestore Database** → Create database (production mode)
   - **Authentication** → Sign-in method → **Phone** (if using phone login)
   - **Storage** → not required when `UPLOAD_STORAGE=local`

4. File uploads (permanent, no Firebase Storage):

```env
UPLOAD_STORAGE=local
# UPLOAD_ROOT=D:\path\to\uploads
```

Files saved under `backend/uploads/public/` and `backend/uploads/private/`.

```bash
cd backend
npm install
npm run dev
```

`GET /health` → `"firebase": true`

## Flutter

- `lib/firebase_options.dart` + `android/app/google-services.json` already set for `youssef-f757e`
- `applicationId`: `com.example.ecommerce_app`

```bash
cd apps/mobile-flutter
flutter pub get
flutter run -d RZCTC0PNLRH
```

## Phone OTP (dev)

With `SMS_CONSOLE_MODE=1`, OTP appears in backend terminal log (no SMS cost).

For real SMS: Twilio env vars or Firebase Phone Auth in Console.
