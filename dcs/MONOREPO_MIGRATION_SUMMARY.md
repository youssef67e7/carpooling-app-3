# Monorepo reorganization — summary

**Date:** 2026-06-20

## What changed

| Before | After |
|--------|-------|
| `backend/admin-web/` | `apps/web/` (served unchanged at `/admin-ui/`) |
| `mobile/` (React Native) | `apps/mobile-legacy/` (copy) + **new** `apps/mobile-flutter/` |
| scattered constants | `shared/constants/`, `shared/services/`, `shared/models/` |
| `mobile/assets/` | root `assets/` (+ Flutter `pubspec` reference) |

## Backend

- **Unchanged location:** `backend/`
- **Path update:** `createApp.js` → admin static files from `apps/web/`
- **Verified:** `GET /admin-ui/` → 200

## Flutter app status

| Layer | Status |
|-------|--------|
| Project scaffold (`pubspec.yaml`, Riverpod, go_router, dio) | ✅ Done |
| API client + all endpoints | ✅ Done |
| Auth provider (phone, email, Google hook) | ✅ Done |
| Login screen (full UI) | ✅ Done |
| Router (passenger / driver / admin tabs + all more-stack routes) | ✅ Done |
| Redux → Riverpod (auth, ride, wallet, driver, ui) | ✅ Core done |
| Socket service wrapper | ✅ Done |
| **49 screen files** | ⚠️ Generated stubs (routes preserved) |
| **44 widget files** | ⚠️ Stubs |
| **18 util files** | ⚠️ Stubs |
| Maps, WebRTC, complex home screens | ❌ Needs port from `mobile-legacy` |
| Flutter SDK on this machine | ❌ Not installed — run `flutter doctor` |

## React Native

- Root `mobile/` may still exist if Metro had files locked — use `apps/mobile-legacy` as canonical reference.
- **Not deleted** — zero feature loss in source.

## Web app

- **No code changes** inside `apps/web/` (index.html, app.js, styles.css).
- Only filesystem move + backend static path.

## Unresolved issues

1. Install **Flutter SDK** and run `flutter pub get` in `apps/mobile-flutter`.
2. Port heavy screens from `apps/mobile-legacy/src/screens/` (PassengerHome, DriverHome, RideChat, InAppCall).
3. Configure Google Sign-In Android/iOS in Flutter (`google_sign_in` + dart-define).
4. Enable **MongoDB Atlas IP allowlist** and backups before production.
5. Remove/archive root `mobile/` after stopping Expo.
6. Update CI (`build-android-apk.yml`) for Flutter when ready.

## Full file map

See [`FLUTTER_MIGRATION_REPORT.md`](FLUTTER_MIGRATION_REPORT.md) — 149 RN files mapped to 143 Flutter artifacts.
