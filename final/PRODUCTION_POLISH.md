# Production Polish Report

## Priority 1 — Block/Suspend Enforcement

### Files Changed

| File | Change |
|---|---|
| `backend/src/routes/auth.js:236` | Added `blockCheck` middleware to `GET /auth/me` |
| `apps/mobile-flutter/lib/core/api/auth_interceptor.dart` | Added 403 `ACCOUNT_BLOCKED` / `ACCOUNT_SUSPENDED` handling |

### Before
- `GET /auth/me` had no `blockCheck` — blocked users' sessions restored normally on app restart, making them appear fully logged in until they hit a protected route
- Flutter auth interceptor only handled 401 — a 403 `ACCOUNT_BLOCKED` was passed through as a generic error

### After
- `GET /auth/me` now runs `blockCheck` — blocked users get 403 on `hydrate()`, triggering `clearLocalSession()` and redirect to login
- Auth interceptor detects 403 + `ACCOUNT_BLOCKED`/`ACCOUNT_SUSPENDED` → force logout + show red snackbar with the server message

### Test Results
- `POST /api/auth/login` with blocked email → 403 `ACCOUNT_BLOCKED` (via `finalizeUserForSession`)
- `GET /api/auth/me` with blocked user's token → 403 `ACCOUNT_BLOCKED`
- Flutter app restart as blocked user → redirects to login with snackbar

---

## Priority 2 — Driver Role Auto-Switch on Approval

### Files Changed

| File | Change |
|---|---|
| `backend/src/routes/admin.js:149-152` | On approval, sets `user.role = "driver"` and `user.active_role = "driver"` |

### Before
- Admin approving a driver only set `driver_application_status = "approved"` and `is_verified = true`
- User's `role` stayed as `"passenger"` — required manual mode switch in the app
- After approval, user could still be redirected to `/passenger/home` instead of `/driver/home`

### After
- On approval, `user.role` and `user.active_role` are both set to `"driver"`
- After push notification arrives, user's next session refresh shows them as driver
- Driver home screen becomes immediately accessible

### Test Results
- `PATCH /admin/users/:id` with `driver_application_status: "approved"` → user's role changes to `"driver"` in DB
- `GET /api/auth/me` returns `role: "driver"` after approval
- Push notification still sent via `notifyDriverVerified`

---

## Priority 3 — Wallet Refund Display

### Files Changed

| File | Change |
|---|---|
| `apps/mobile-flutter/lib/features/wallet/wallet_overview_screen.dart:124` | Added `ride_refund` to `isCredit` |
| `apps/mobile-flutter/lib/features/wallet/wallet_screens.dart:497` | Added `ride_refund` to `isCredit` |
| `apps/mobile-flutter/lib/features/driver/driver_earnings_wallet_screen.dart:126` | Added `ride_refund` to `isCredit` |
| `apps/mobile-flutter/lib/l10n/en.json:757` | Added `walletTxType_ride_refund: "Refund"` |
| `apps/mobile-flutter/lib/l10n/ar.json:757` | Added `walletTxType_ride_refund: "استرداد"` |

### Before
- `ride_refund` transactions displayed as debits (`-` sign, red/black color, `send` icon) in all 3 wallet screens
- `walletTxType_ride_refund` had no translation key → displayed raw string `"ride_refund"`

### After
- `ride_refund` displays as credit (`+` sign, green, `add` icon) in all 3 wallet screens
- Label shows `"Refund"` (en) / `"استرداد"` (ar)
- Backend refund flow (admin + auto-cancellation) was already correct — only UI display was wrong

### Test Results
- `flutter analyze`: 0 errors, 0 warnings
- No visual test possible offline — requires refund transaction in DB

---

## Priority 4 — Driver Application UI Differentiation

### Files Changed

| File | Change |
|---|---|
| `apps/mobile-flutter/lib/features/auth/driver_home_screen.dart:119-153` | Rejected state shows red banner, pending shows amber banner |
| `apps/mobile-flutter/lib/features/driver/driver_status_screens.dart:285-320` | Added rejection card with icon, admin review note, and support button |
| `apps/mobile-flutter/lib/l10n/en.json:896-897` | Added `driverRejectedBanner`, `driverApplicationRejected` |
| `apps/mobile-flutter/lib/l10n/ar.json:896-897` | Added translations |

### Before
- All non-approved, non-none statuses showed the same yellow "under review" banner
- No visual distinction between pending and rejected
- `DriverVerificationStatusScreen` showed progress bars even for rejected applications

### After
- **Pending**: Yellow/ambient `DriverInfoBanner` with "under review" text (unchanged)
- **Rejected**: Red banner with warning icon + "not approved" text, tappable to verification screen
- **Verification screen**: When `applicationStatus == "rejected"`, shows a red card with:
  - Cancel icon + "Application Not Approved" header
  - Admin's review note (if available)
  - "Contact Support" outlined button

### Test Results
- `flutter analyze`: 0 errors, 0 warnings
- Verified conditional rendering logic covers all 4 values of `driverApplicationStatus`: `none`, `pending`, `approved`, `rejected`

---

---

## Delete Account (Phase 6)

### Files Changed

| File | Change |
|---|---|
| `backend/src/routes/auth.js` | Added `POST /auth/delete-account` endpoint with password verification + cascade delete |
| `backend/src/routes/auth.js:1-18` | Added missing model imports (DriverProfile, DriverDocuments, Transaction, FcmToken, Notification, WithdrawalRequest, Report, Message, Booking, Ride, AdminAuditLog) |
| `apps/mobile-flutter/lib/core/api/api_endpoints.dart:82` | Added `authDeleteAccount = '/auth/delete-account'` |
| `apps/mobile-flutter/lib/core/providers/auth_provider.dart:425-443` | Added `deleteAccount({String? password})` method |
| `apps/mobile-flutter/lib/features/auth/settings_screen.dart:146-198` | Added "Delete Account" button in account section with password dialog (for email users) or confirmation dialog (for Google/phone users) |
| `apps/mobile-flutter/lib/features/auth/settings_screen.dart:18` | Added `api_error_message.dart` import |
| `apps/mobile-flutter/lib/l10n/en.json:932-933` | Added `deleteAccount`, `deleteAccountConfirm` keys |
| `apps/mobile-flutter/lib/l10n/ar.json:932-933` | Added Arabic translations |

### Before
- No self-deletion endpoint existed — only admins could delete users
- Users had no way to remove their account from the app

### After
- `POST /api/auth/delete-account` accepts optional password, cascade-deletes all associated data (same as admin delete), revokes all sessions
- Settings screen shows "Delete Account" button in the Account section
- Email/password users must enter their password for confirmation
- Google/phone users get a simple confirmation dialog (no password required)
- After deletion, user is navigated to `/login` with all local tokens cleared

### Test Results
- `flutter analyze`: 0 errors, 0 warnings
- Backend deployed to Vercel production

## Remaining Known Issues

| # | Issue | Priority | Notes |
|---|---|---|---|
| 1 | **Report resolution does not notify reporter** | Medium | Admin resolves a report but no push/email is sent to the reporter. Requires creating a `notifyReportResolved` notification helper and calling it from `PATCH /admin/reports/:id`. |
| 2 | **No foreground lifecycle refresh** | Low | If a push notification arrives while the app is open, the FCM handler shows a banner but does not call `validateSession()` or `driverProvider.refresh()`. User must pull-to-refresh to see state changes. |
| 3 | **Admin web UI JWT expires after 15 min** | Low | `signUserToken` sets 15m expiry. Web admin has no refresh-token rotation. Admin must re-login after 15 min of inactivity. |
| 4 | **No "My Reports" screen for users** | Low | Users cannot view their submitted reports or track resolution status. |
| 5 | **`_emailLogin` unused method** | Low | Pre-existing dead code in `login_screen.dart:201`. Safe to remove. |
| 6 | **`nearby-drivers` returns 400 when location is NaN** | Low | Vehicle type selection triggers `nearby-drivers` call before user location is set. Cosmetic error in logs. |
