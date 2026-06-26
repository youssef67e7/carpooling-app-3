# WERET UX Design Audit — Deep Logic Review

> **Date**: 2026-06-26
> **Scope**: Full Flutter mobile app (132 lib/ files across passenger, driver, admin roles)
> **Method**: Source-code trace through routing, state management, providers, screens, and shared widgets

---

## 1. AUTH FLOW

### ✅ Good

| Element | Detail |
|---------|--------|
| **Progressive disclosure** | Onboarding (2 carousel pages) -> Welcome -> Step-by-step OTP/credential flows |
| **Multi-modal auth** | Phone (Firebase SMS), Email, Google -- all converge into `applySession()` |
| **Session hydration** | App boot -> `hydrate()` -> cached user shown instantly -> fresh fetch in background |
| **Redirect safety** | Router redirect checks `hydrated` flag; never redirects before session loaded |
| **Force-logout** | `TokenManager.onForceLogout` -> `clearLocalSession()` -> re-routes to `/login` |

### Issues

**1. Phantom redirect guard for `/register/driver`**
- File: `app_router.dart:65`
- The check `if (loggedIn && loc == '/register/driver')` matches only the literal path, but `DriverRegisterScreen` immediately delegates to `DriverOnboardingScreen(fromSignup: true)`. A logged-in user hitting `/register/driver` won't be caught because the guard is bypassed by the delegated routing.

**2. Dead text field on welcome step**
- File: `login_screen.dart:201`
- The welcome screen shows a "Phone number or Email" text field, but the "Continue" button goes to phone-only flow. The field is decorative -- typing has no effect. **Dead UI element.**

**3. No password recovery on phone login path**
- Only the email step has a "Forgot password?" link. Phone OTP users who forgot credentials have no recovery path. Should offer "Use email instead" prominently.

**4. Google Sign-In uses placeholder image**
- File: `login_screen.dart:277`
- `Image.asset('assets/images/placeholder.png')` -- users see a grey box instead of the Google "G" logo.

**5. Silent force-logout on server failure during hydrate**
- File: `auth_provider.dart:70`
- When `auth/me` validation fails during hydration, `clearLocalSession()` is called without user feedback. A temporary server outage force-logs the user silently.

---

## 2. PASSENGER UX FLOW

### ✅ Good

| Element | Detail |
|---------|--------|
| **Location init on mount** | GPS permission -> location fetch -> map center -> nearby drivers -> route preview |
| **State-driven active ride panel** | Map, status messages, chat/cancel/report all react to `activeRide.status` |
| **Rating prompt guard** | `_ratingPromptRideId` prevents re-triggering rating modal for same ride |
| **Route preview on change** | Both map selection and text changes trigger `_refreshRoutePreview()` |
| **Nearby driver markers** | Drivers displayed on map as visual indicators |
| **Driver offer banner** | Accept/reject UI for price proposals from drivers |

### Issues

**6. Fragmented ride status documentation**
- Ride states in code: `pending -> accepted -> driver_arriving -> passenger_onboard -> ongoing -> completed`
- But `AGENTS.md` audit notes list `driver_arriving` and `passenger_onboard` as missing. States exist in code but docs are out of sync.

**7. Conflicting dual CTA buttons**
- File: `passenger_home_screen.dart:228` vs `:306`
- "Search Driver" button (opens map picker) and "Request Ride" button (submits booking) look identical (same FilledButton style, same position). Both only appear conditionally but overlap in visual priority.

**8. No loading indicator for nearby drivers**
- `_refreshNearby()` is fire-and-forget with no skeleton/spinner. Network delays leave the section silently empty.

**9. Map doesn't auto-fit to pickup alone**
- `_refreshRoutePreview()` calls `fitMapToPoints` only when both pickup + destination are set. Before destination selection, the map stays at default Riyadh center instead of centering on the pickup.

**10. Text fields fake affordance**
- Pickup/destination use `AbsorbPointer` + `GestureDetector` over `TextField`. Users see an editable field but can't type -- must tap to open a full-screen map picker. Violates the **affordance principle**. Should use a `TapableBox` or styled read-only container.

**11. No pull-to-refresh on passenger home**
- Data loads on `initState` but no `RefreshIndicator`. If a driver accepts and the socket update is missed, the UI stays stale.

**12. fetchHistory called without dedup**
- Multiple actions (cancel, end ride, rate) call `fetchHistory()` which pings the server each time with no debouncing or caching.

---

## 3. DRIVER UX FLOW

### ✅ Good

| Element | Detail |
|---------|--------|
| **Online/offline toggle** | Color feedback (green/red) + GPS tracker auto start/stop |
| **Progressive ride actions** | "I've arrived" -> "Passenger onboard" -> "Start trip" -> "End trip" mapped to status |
| **Concurrent ride handling** | `maxConcurrent=2`, `canTakeMore` gate, sort by `acceptedAt` |
| **Earnings + rating chips** | Live session stats in header |
| **Request cards** | Premium badge, passenger photo, route, fare, accept/decline |
| **Location tracker lifecycle** | Auto-stops on offline, tied to `driverLocationTrackerProvider` |

### Issues

**13. Reversed onboarding for new signups**
- `DriverRegisterScreen` delegates to `DriverOnboardingScreen(fromSignup: true)` which collects: personal info -> vehicle -> banking -> **then creates account**. User fills 3-4 steps unauthenticated. If account creation fails at the end, all data is lost.

**14. No ride request sound/vibration**
- Available rides list is a passive pull-to-refresh list. No notification sound or vibration for new requests -- a critical UX gap for driver response time.

**15. Action button labels show enum keys**
- File: `driver_home_screen.dart:258-265`
- Status label shows `rideStatus_accepted`, `rideStatus_driver_arriving` instead of user-friendly text. The action buttons ("I've arrived", "Passenger onboard") are correct, but the header label is raw localization key.

**16. Missing address fallback renders "🫥"**
- File: `driver_home_screen.dart:345`
- `ride['pickupLocation']['address']` with no fallback displays `'🫥'` when address is missing. No reverse geocoding fallback to lat/lng.

**17. GPS tracker may persist after logout**
- `session_reset.dart` does not clear `driverLocationTrackerProvider`. If a driver logs out, the tracker keeps polling until widget disposal.

**18. No driver earnings history graph**
- Earnings are shown as a flat number ($X.XX) with no chart or trend visualization across days/weeks.

---

## 4. ADMIN UX FLOW

### ✅ Good

| Element | Detail |
|---------|--------|
| **Rich dashboard** | KPI cards, ride status chart, recent activity feed, quick action chips |
| **Paginated lists** | Users, rides, reports, transactions, audit log with search/prev/next |
| **Moderation sheet** | Admin actions on users via bottom sheet |
| **Report management** | Status transitions: open -> reviewing -> resolved/dismissed |
| **Transaction flagging** | Toggle flag/unflag with reason |

### Issues

**19. Stub file conflict**
- `features/auth/admin_dashboard_screen.dart` and `features/auth/admin_screens.dart` both define `AdminDashboardScreen`. The stub in `admin_dashboard_screen.dart` renders "migrated route preserved" while `admin_screens.dart` has the real implementation. **Dead-code hazard.**

**20. No real-time updates**
- Admin screens rely entirely on manual pull-to-refresh. No WebSocket, polling, or FCM bridge updates the dashboard KPI cards.

**21. User ban status not visible in list**
- `AdminUserCard` doesn't show the user's current block/ban status without tapping through to `AdminModerationSheet`.

**22. No admin notification when driver applies**
- Pending driver applications only surface on dashboard KPI count. No push notification or in-app alert.

---

## 5. CROSS-CUTTING UX ISSUES

### Navigation & Routing

| # | Issue | File/Line |
|---|-------|-----------|
| 23 | **No deep link handling for FCM** -- notification taps don't navigate to ride/chat | `app_router.dart` |
| 24 | **Tab resets on re-selection** -- `goBranch` by default resets tab nav stack | `passenger_shell.dart` |
| 25 | **No debug FAB** -- debug log screen exists at `/debug/log` but no quick-access FAB | `app.dart` |

### State Management

| # | Issue | File/Line |
|---|-------|-----------|
| 26 | **`_messageIdempotencyKeys` memory leak** -- keys accumulate forever | `ride_provider.dart:115` |
| 27 | **No optimistic UI** -- all ride actions wait for server before updating | `ride_provider.dart` |
| 28 | **Ride state merge logic is complex** -- `_mergeActiveRide` has 40+ lines of branching | `ride_provider.dart:46-87` |

### Error Handling

| # | Issue | Evidence |
|---|-------|----------|
| 29 | **3 different error display patterns** | SnackBar (login), inline text (register), showAlert (settings) |
| 30 | **No retry on network failure** | Most API calls log/show error but offer no retry (except PassengerHistoryScreen) |
| 31 | **Debug errors written to FlutterError.onError** but no user-facing banner | `main.dart:11` |

### Accessibility

| # | Issue | Evidence |
|---|-------|----------|
| 32 | **No semantic labels on icons** | VoiceOver/TalkBack reads "button" without context |
| 33 | **No `MediaQuery.textScaleFactor` handling** | All font sizes absolute; accessibility font scaling may clip text |
| 34 | **No accessibility landmarks** | No `Semantics` widget usage found across any screen |

### Data Freshness

| # | Issue | Evidence |
|---|-------|----------|
| 35 | **No background polling for ride status** | Passenger relies on `initState` fetch only; no periodic refresh |
| 36 | **Driver available rides not filtered by location** | `fetchAvailable` has no lat/lng params |
| 37 | **Admin stats not refreshed** | `_lastStatsAt` is tracked but not used for auto-refresh |

---

## 6. UI CONSISTENCY

| # | Issue | Evidence |
|---|-------|----------|
| 38 | **Two color token systems** | `AppColors` (passenger) vs `WeretTokens` (driver/admin) -- same values, dual maintenance |
| 39 | **Button style duplication** | `FilledButton.styleFrom(bg: AppColors.primary, radius: 12)` copy-pasted in every screen |
| 40 | **Placeholder images everywhere** | Google icon, car images, onboarding -- all use `assets/images/placeholder.png` |
| 41 | **Inconsistent border radius** | Cards: 16px, 18px, 20px all used interchangeably with no system |
| 42 | **No dark mode verification** | `WeretTheme.dark` exists but hasn't been QA'd across all screens |

---

## 7. Scorecard Summary

| Area | Score | Critical Priority |
|------|-------|-------------------|
| Auth flow UX | 7/10 | Dead text field, Google icon, silent force-logout |
| Passenger UX | 6/10 | Dual CTA, fake text fields, no pull-to-refresh |
| Driver UX | 6/10 | No ride sound, reversed onboarding, action labels |
| Admin UX | 5/10 | Stub conflict, no real-time, no auto-refresh |
| Error handling | 4/10 | Inconsistent patterns, no retry, no optimistic UI |
| Accessibility | 3/10 | Zero semantic labels, no text scale, no landmarks |
| Code maintainability | 5/10 | Token duality, style duplication, no debouncing |

### Top 5 Must-Fix Items (by user impact)

1. **#2** -- Dead text field on login welcome step (every user sees this)
2. **#10** -- Fake editable text fields for pickup/destination (every passenger)
3. **#14** -- No ride request notification sound for drivers (driver response time)
4. **#13** -- Reversed driver onboarding losing data on account failure (driver conversion)
5. **#5** -- Silent force-logout on server failure (user trust)

---

## 8. Figma Spec vs Code — Design Alignment Gap

> Cross-reference of a 40-screen Figma export against the Flutter codebase. Full report: `SPEC_VS_CODE_CROSS_REFERENCE.md`

### 8.1 Token Alignment (0–10%)

| Domain | Spec Expects | Code Has | Match |
|--------|-------------|----------|-------|
| **Color palette** | Lavender-tinted neutrals `#F2F3FD`, `#F9F9FF`, `#DADCEF` | Gray neutrals `#F9FAFB`, `#E5E7EB`, `#D1D5DB` | ❌ 0% |
| **Primary Blue** `#1978E5` | Links, progress bars, info banners, status accents | **No blue token exists** — all CTA is black `#000000` | ❌ Missing |
| **Status colors** | Success `#22C55E`, Error `#BA1A1A` | Success `#10B981`, Error `#EF4444` | ❌ Wrong hex |
| **Font family** | Rounded geometric sans (Poppins/Baloo 2/Nunito) | `"Roboto"` / `"SansSerif"` | ❌ Wrong font |
| **Typography colors** | Slate `#414753` body, Cool Gray `#717785` meta | `#6B7280` body, `#9CA3AF` meta | ❌ 40% off |

### 8.2 Screen Coverage (0–57%)

| Flow | Spec Screens | Code Has | Match % | Gap |
|------|-------------|----------|---------|-----|
| A — Onboarding | 3 | 2 screens, placeholder images | 0% | No car photography; missing 3rd slide |
| B — Auth | 8 | 1 screen (multi-step), no split OTP | 0% | Missing B4 (loading), B7 (welcome); single-field OTP |
| C — Personalization | 1 | **None** | **0%** | Gender selection not implemented |
| D — Rider Home | 4 | 2 screens (home + map picker) | 0% | Different layout; missing D3 delivery flow |
| E — Carpool | 3 | **None** | **0%** | Entire feature missing |
| F — Rider Profile | 5 | 3 screens (more menu, settings, history) | 0% | Wrong structure; no edit profile, no filter tabs |
| G — Driver Onboarding | 7 | 5 steps (combined) | 57% | Closest match; missing G7 celebration |
| H — Driver Home | 3 | 2 screens (home + request detail) | 33% | Missing premium ribbon and orange surge CTA |
| I — Wallet | 6 | 5 screens (various) | 17% | Header color mismatch; no numeric keypad |

### 8.3 Missing Shared Components (from Spec)

- **Status pill/tag** — tinted bg + colored text (used on 10+ screens in spec; hand-rolled in code)
- **Bottom sheet wrapper** — standardized white sheet, dimmed scrim (each screen builds its own)
- **Split OTP input** — 4×56px boxes (code uses single text field)
- **Numeric keypad** — for wallet amount entry (code uses soft keyboard)
- **Ticket/receipt card** — scalloped perforated edges
- **Avatar editor** — photo + edit badge overlay
- **Country code selector** — flag + code chip

### 8.4 Feasibility Conflicts

| Spec Requirement | Code Constraint | Verdict |
|-----------------|----------------|---------|
| Lavender palette | Tokens centralized in `AppColors` | ✅ Easy swap |
| Primary Blue `#1978E5` | Must decide if it replaces `brand` (affects all black buttons) | ⚠️ Needs design decision |
| Rounded font | Add to `pubspec.yaml`, update theme | ✅ Medium effort |
| Carpool feature (3 screens) | New backend model + endpoints + state management | ❌ High effort |
| Split OTP | Many community packages available | ✅ Low effort |
| Receipt scalloped edges | Requires `CustomPainter` | ⚠️ Medium effort |

### 8.5 Top 5 Spec-Code Gaps by User Impact

| # | Gap | Who Sees It | Fix |
|---|-----|------------|-----|
| 1 | Lavender-tinted palette → wrong gray colors | All users | Swap color tokens (see T-001) |
| 2 | No font → Roboto instead of rounded geometric | All users | Add Google Fonts (T-005) |
| 3 | No Primary Blue → all CTAs are black | All users | Add `#1978E5` token (T-002) |
| 4 | Single OTP field → no split 4-box input | All auth users | Build `OtpInput` widget (T-027) |
| 5 | Rider home layout → gallery chips instead of Ride/Deliver cards | All passengers | Restructure home (T-046) |

---

*Generated from source-code trace: 35+ files across `lib/` (routing, providers, screens, widgets, services)*
