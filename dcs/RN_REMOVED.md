# React Native removed

The mobile app is **Flutter only**: `apps/mobile-flutter/`

React Native folders (`mobile/`, `apps/mobile-legacy/`) have been deleted from this repo.

## First-time setup

1. Install [Flutter SDK](https://docs.flutter.dev/get-started/install)
2. Run from repo root:

```powershell
.\scripts\init-flutter.ps1
```

3. Start backend + run app:

```powershell
npm run backend
cd apps/mobile-flutter
flutter run --dart-define=API_URL=http://YOUR_LAN_IP:3000
```

## Architecture

| Client | Path | API |
|--------|------|-----|
| Flutter mobile | `apps/mobile-flutter/` | Same REST + Socket.IO |
| Admin web | `apps/web/` | Same REST at `/admin-ui/` |
| Backend | `backend/` | Express + MongoDB Atlas |

Both clients use `shared/services/apiEndpoints.js` (JS) and `apps/mobile-flutter/lib/core/api/api_endpoints.dart` (Dart) for the same contract.

See also: `docs/FLUTTER_MIGRATION_REPORT.md`, `BUILD_APK.md`
