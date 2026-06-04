# Google Sign-In via Firebase Authentication

The **Continue with Google** button uses Firebase Auth’s Google provider when Firebase env vars are set.

## Flow

1. App gets a **Google ID token** (native SDK or OAuth).
2. App signs in to **Firebase Auth** with `GoogleAuthProvider.credential(idToken)`.
3. App sends the **Firebase ID token** to `POST /auth/google`.
4. Backend verifies it with **Firebase Admin SDK** and creates/logs in the MongoDB user.

Without Firebase env vars, the app still sends the Google token directly (previous behavior).

## Quick setup (automatic)

1. Download from Firebase Console:
   - `google-services.json` → save as **`mobile/google-services.json`**
   - Service account JSON → save as **`backend/firebase-service-account.json`**
2. From repo root:

```bash
npm run setup:firebase
```

3. Restart API + Expo, then `cd mobile && npm run android:google`

---

## Manual setup

1. [Firebase Console](https://console.firebase.google.com/) → your project.
2. **Build → Authentication → Sign-in method → Google → Enable**.
3. **Project settings → General → Your apps** → add Android app:
   - Package: `com.ridehail.app`
   - SHA-1: from `cd mobile/android && ./gradlew signingReport`
4. Copy **Web client ID** from Authentication → Google (or Project settings).  
   Use it as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `GOOGLE_OAUTH_WEB_CLIENT_ID` (must match Firebase).
5. Download `google-services.json` (optional for FCM; Google Sign-In uses env client IDs above).

## 2. Service account (backend)

1. Firebase → **Project settings → Service accounts → Generate new private key**.
2. Save JSON outside git, e.g. `backend/firebase-service-account.json` (add to `.gitignore`).
3. In `backend/.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

Or inline:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Restart the API after changes.

## 3. Mobile `mobile/.env`

From Firebase **Project settings → General → Your apps → Web app** (or SDK config):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=   # Web client ID from Firebase → Authentication → Google
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Restart Expo (`r` in Metro). Use a **development build** (`npm run android:google`), not Expo Go.

## 4. Verify

- `GET http://YOUR_API/auth/google-config` → `"firebaseEnabled": true`
- Press **Continue with Google** → pick Test user Gmail → logged in
