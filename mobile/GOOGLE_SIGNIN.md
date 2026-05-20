# Google Sign-In (WERET mobile + backend)

## 0. Enable APIs (fixes “Access Not Configured” / APIs error)

In [Google Cloud Console](https://console.cloud.google.com/):

1. **APIs & Services → Library** → search **Google Identity Services API** → **Enable**.
2. (If profile/email fails) also enable **Google People API**.
3. **APIs & Services → OAuth consent screen** → create app → add scopes `email`, `profile`, `openid`.
4. If status is **Testing**, add your Gmail under **Test users**.

Without step 0–3, Google shows an error about APIs / console configuration.

## 1. Google Cloud Console — Credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create **OAuth client ID → Web application** → copy the Client ID (`….apps.googleusercontent.com`).
3. Under **Authorized redirect URIs**, add **both**:
   - `weret:/oauthredirect`
   - `com.ridehail.app:/oauthredirect`
4. (Recommended for Android dev build) Create **OAuth client ID → Android**:
   - Package name: `com.ridehail.app`
   - SHA-1: from debug keystore (see below)

### Android SHA-1 (debug)

From repo root:

```bash
cd mobile/android
./gradlew signingReport
```

Copy **SHA-1** under `Variant: debug` → paste into the Android OAuth client.

## 2. Backend `.env`

In `backend/.env` add (same Web client ID):

```env
GOOGLE_OAUTH_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_OAUTH_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
```

Restart API: `npm run dev` (or restart backend process).

Check: open `http://localhost:3000/auth/google-config` → `"enabled": true`.

## 3. Mobile `.env`

In `mobile/.env` add:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
```

Restart Expo (`r` in Metro). Use a **development build** (`npm run start:dev-client`), not Expo Go.

## 4. Redirect URI in Metro log

After reload, Metro prints:

```
[Google OAuth] redirectUri: …
```

If Google shows `redirect_uri_mismatch`, add **that exact URI** to the Web client redirect list.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| "Google is not configured" | Set `GOOGLE_OAUTH_WEB_CLIENT_ID` on backend + restart |
| `redirect_uri_mismatch` | Add redirect URI from Metro log to Google Web client |
| "Google sign-in failed" (401) | Web client ID on phone must match backend; audiences must include the client that issued the token |
| Button does nothing | Wait for `googleReady`; check Metro for errors |
