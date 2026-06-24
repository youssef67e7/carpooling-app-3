# Build APK — WERET (Flutter)

Mobile app path: **`apps/mobile-flutter/`** (React Native removed).

## Option 1: GitHub Actions (recommended)

1. Push the repo to GitHub
2. **Actions** → **Build Android APK (Flutter)** → **Run workflow**
3. Download artifact **`WERET-debug-apk`** when the job finishes

Optional GitHub **Variables**:
- `API_URL` = `http://YOUR_PC_LAN_IP:3000`

---

## Option 2: Local build

### Prerequisites

1. Install [Flutter SDK](https://docs.flutter.dev/get-started/install) (stable channel)
2. Install Android Studio + SDK (for Android builds)
3. From repo root, initialize platform folders once:

```powershell
.\scripts\init-flutter.ps1
```

### Run on device / emulator

```powershell
cd apps/mobile-flutter
flutter pub get
flutter run --dart-define=API_URL=http://YOUR_LAN_IP:3000
```

### Build APK locally

```powershell
cd apps/mobile-flutter
flutter build apk --debug --dart-define=API_URL=http://YOUR_LAN_IP:3000
```

APK output:
`apps/mobile-flutter/build/app/outputs/flutter-apk/app-debug.apk`

---

## After install

1. Start backend: `npm run backend` (same Wi‑Fi as phone)
2. Use your PC LAN IP in `API_URL` (not `localhost`)
3. Google Sign-In needs a release/debug build with your OAuth client IDs configured

---

## Web admin (same API)

Admin panel: `apps/web/` → `http://localhost:3000/admin-ui/`

Flutter mobile and admin web share the **same Express API** and **MongoDB Atlas** database.
