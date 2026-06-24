# WERET

Full-stack ride-hailing: **Flutter mobile** + **Express API** + **Admin web**.

## Structure

```
apps/
  mobile-flutter/   ← Flutter app (iOS + Android)
  web/              ← Admin panel (/admin-ui/)
backend/            ← Express + MongoDB Atlas
shared/             ← Constants + API contract
assets/             ← Shared images
```

## Run

```bash
# Backend + admin web
npm run backend
# http://localhost:3000/admin-ui/

# Flutter — install SDK first: https://docs.flutter.dev/get-started/install
npm run init:flutter
cd apps/mobile-flutter
flutter run --dart-define=API_URL=http://YOUR_LAN_IP:3000
```

See `BUILD_APK.md` for APK builds (GitHub Actions or local).

## Stack

| Layer | Tech |
|-------|------|
| Mobile | Flutter, Riverpod, go_router, easy_localization |
| Web admin | HTML/JS (`apps/web`) — same REST API as mobile |
| Database | MongoDB Atlas (`MONGODB_URI` in `backend/.env`) |
| API | Express (JWT auth, REST, Socket.io) |
| Auth | JWT (phone OTP, Google, email) |

React Native has been **removed**. See `docs/FLUTTER_MIGRATION_REPORT.md`.
