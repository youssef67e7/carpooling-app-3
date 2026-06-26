# WERET Implementation Backlog

> **Generated:** 2026-06-26
> **Source:** Figma spec (40 screens) vs code (132 lib/ files) cross-reference
> **Priority:** P0 = blocking / P1 = high / P2 = medium / P3 = low / P4 = nice-to-have

---

## Phase 0 — Design Token Alignment (Low Effort, High Impact)

| ID | Task | Files | Effort | Priority |
|----|------|-------|--------|----------|
| T-001 | **Update color palette** — replace gray neutrals with lavender-tinted spec (`#F2F3FD`, `#F9F9FF`, `#DADCEF`, `#414753`, `#717785`) | `app_colors.dart`, `weret_tokens.dart` | 1hr | P0 |
| T-002 | **Add Primary Blue `#1978E5`** — new token for links, progress bars, info banners, status accents | `app_colors.dart`, `weret_tokens.dart` | 15min | P0 |
| T-003 | **Update status colors** — Success `#22C55E`, Error `#BA1A1A` per spec | `app_colors.dart` | 15min | P0 |
| T-004 | **Add Premium Orange tokens** — `#964400` (button fill), `#BD5700` (price pill) for surge/premium ride CTAs | `app_colors.dart` | 10min | P1 |
| T-005 | **Add rounded geometric font** — install Poppins or Nunito via Google Fonts; update `fontFamily` in `WeretTheme` | `pubspec.yaml`, `weret_theme.dart` | 1hr | P0 |
| T-006 | **Update typography sizes/weights/colors** — match spec scale: body Slate `#414753`, eyebrow Cool Gray `#717785`, field label 12px Medium, price 24–32px | `app_styles.dart`, `weret_theme.dart` | 2hr | P1 |
| T-007 | **Unify into single design token system** — eliminate dual `AppColors` / `WeretTokens`; pick one | `app_colors.dart`, `weret_tokens.dart`, all imports | 4hr | P2 |
| T-008 | **Update input decoration theme** — field fill `#F2F3FD`, border `#DADCEF` | `weret_theme.dart` | 30min | P1 |
| T-009 | **Update outlined button border** — change from `brand` (black) to `#DADCEF` per spec | `weret_theme.dart` | 10min | P1 |
| T-010 | **Replace destructive red** — update all error/destructive actions from `#EF4444` to `#BA1A1A` | `app_colors.dart`, grep all uses | 30min | P2 |

---

## Phase 0B — Image Assets (Ready from Design Export)

Design images are in `C:\Users\boda.DESKTOP-019V550\Downloads\WERET_design_images\design_images\`. Full mapping in `README_image_screen_mapping.md`.

| ID | Task | Image(s) | Target Screen(s) | Effort | Priority |
|----|------|---------|-----------------|--------|----------|
| T-010a | **Place onboarding car hero images** — replace `placeholder.png` with spec photography | `01_onboarding2_car_front_suv.png` (A3), `02_onboarding1_car_topview.png` (A2) | `weret_onboarding_screen.dart` pages 1 & 2 | 1hr | P1 |
| T-010b | **Place Google Sign-In avatar images** — round-crop for modal avatar row | `03_google_modal_avatar_a.png`, `04_google_modal_avatar_b.jpg` | Login screen Google flow (screen B5/B6 — not custom UI, but available as avatar source) | 15min | P2 |
| T-010c | **Place delivery van illustration** — `05_home_delivery_van_illustration.png` | D1 Home "Send a package" card | New `delivery_card_widget.dart` (part of rider home restructure T-046) | 15min | P2 |
| T-010d8 | **Note: Map images are layout placeholders only** — `06_map_san_francisco.png`, `07_map_confirm_pickup_greentint.png`, `14_map_driver_dashboard_nynj.png` are static screenshots. Treat as layout reference only; use live map SDK in production. | | D2, D4, H3 (map), H1 (driver dashboard) | N/A | — |
| T-010e | **Place carpool trip avatar** — `08_avatar_sarah_mitchell_carpool.jpg` | E1 "Going the Same Way?" carpool results card | New carpool screen (T-037) | 15min | P2 |
| T-010f | **Place profile photo (Mimmo)** — `09_avatar_mimmo_profile.jpg` (full-res 3024×4032 — needs compress to 512×512) | F1 Profile (rider), F2 Personal Information, H2 Profile (driver) | `passenger_more_menu_screen.dart` avatar area, new profile screens (T-049) | 1hr (with compression) | P2 |
| T-010g | **Place ride history driver avatars** — `10_avatar_marcus_chen_ridehistory.jpg`, `11_avatar_sarahjenkins_ridehistory.jpg`, `12_avatar_davidwilson_ridehistory.jpg` | F5 Ride History ride cards | New ride history layout (T-051) | 30min | P2 |
| T-010h | **Place driver steering wheel hero** — `13_hero_driver_steeringwheel_sunset.png` | G5 "Application Received!" mid-page | `driver_onboarding_screen.dart` submit-success path | 15min | P2 |
| T-010i | **Place driver dashboard avatars** — `15_avatar_sarahjenkins_driverdash.jpg`, `16_avatar_michaelross_driverdash.jpg`, `17_avatar_elenarodriguez_driverdash.jpg` | H1 Driver Dashboard request cards | `driver_home_screen.dart` request cards | 30min | P1 |
| T-010j | **Place new request rider avatar** — `18_avatar_sarahjenkins_newrequest.jpg` | H3 New Request rider card | `driver_request_detail_screen.dart` | 15min | P2 |
| T-010k | **Consolidate assets into Flutter** — copy all 18 images to `apps/mobile-flutter/assets/images/design/`; update `pubspec.yaml`; create asset constant map | All + `pubspec.yaml` | 30min | P0 |
| T-010l | **Flag "Sarah Jenkins" photo inconsistency to design team** — three different photos used for same character name across screens (#11 vs #15 vs #18) | Design team communication | — | P2 |

---

## Phase 1 — Critical UX Bugs (from Audit)

| ID | Task | Files | Effort | Priority |
|----|------|-------|--------|----------|
| T-011 | **Fix phantom redirect guard** — `/register/driver` guard should catch logged-in users even when delegated to `DriverOnboardingScreen` | `app_router.dart:65` | 30min | P1 |
| T-012 | **Remove dead text field on login welcome** — replace decorative phone/email field with clear flow direction (phone-focused CTA) | `login_screen.dart:201` | 1hr | P0 |
| T-013 | **Add "Use email instead" on phone OTP step** — recovery path for phone users | `login_screen.dart` | 30min | P1 |
| T-014 | **Replace Google icon placeholder** — use proper Google "G" asset or inline SVG | `login_screen.dart:277`, assets | 30min | P1 |
| T-015 | **Show user-friendly error on hydrate failure** — toast/banner instead of silent force-logout | `auth_provider.dart:70` | 30min | P1 |
| T-016 | **Replace AbsorbPointer text fields** — use read-only styled containers for pickup/destination | `passenger_home_screen.dart` | 1hr | P0 |
| T-017 | **Add pull-to-refresh on passenger home** | `passenger_home_screen.dart` | 30min | P1 |
| T-018 | **Debounce fetchHistory calls** — add 2s debounce when multiple ride actions fire consecutively | `ride_provider.dart` | 1hr | P2 |
| T-019 | **Add ride request notification sound** — play system sound / vibration on new available ride for drivers | `driver_home_screen.dart`, `ride_provider.dart` | 2hr | P0 |
| T-020 | **Fix status label localization** — show user-friendly text instead of `rideStatus_accepted` raw key | `driver_home_screen.dart:258` | 30min | P1 |
| T-021 | **Add reverse-geocoding fallback** — when address field missing, reverse-geocode from lat/lng | `driver_home_screen.dart:345`, `passenger_home_screen.dart` | 1hr | P1 |
| T-022 | **Stop GPS tracker on logout** — add to `session_reset.dart` | `session_reset.dart`, `driver_location_tracker.dart` | 30min | P2 |
| T-023 | **Resolve admin stub conflict** — delete `admin_dashboard_screen.dart` stub, keep `admin_screens.dart` real impl | file cleanup, route imports | 15min | P1 |
| T-024 | **Clean up _messageIdempotencyKeys** — evict old keys periodically | `ride_provider.dart:115` | 30min | P3 |

---

## Phase 2 — Shared Component Library

| ID | Task | Files | Effort | Priority |
|----|------|-------|--------|----------|
| T-025 | **Create `StatusPill` widget** — tinted bg + colored text, variants: success/info/neutral/error/warning | New file `shared/widgets/status_pill.dart` | 1hr | P1 |
| T-026 | **Create `BottomSheet` wrapper** — standardized white sheet, rounded top corners, dimmed scrim | New file `shared/widgets/app_bottom_sheet.dart` | 1hr | P2 |
| T-027 | **Create `OtpInput` widget** — 4×56px square boxes, auto-advance, backspace handling | New file `shared/widgets/otp_input.dart` | 2hr | P1 |
| T-028 | **Create `VerticalSpacing` token system** — eliminate hardcoded `SizedBox(height: X)` everywhere | `weret_tokens.dart` + codemod | 3hr | P2 |
| T-029 | **Create `NumericKeypad` widget** — for wallet amount entry (I3) | New file `shared/widgets/numeric_keypad.dart` | 3hr | P2 |
| T-030 | **Create `TicketCard` widget** — scalloped/perforated edges for receipt display | New file `shared/widgets/ticket_card.dart` | 3hr | P3 |
| T-031 | **Create `AvatarEditor` widget** — profile photo + edit badge overlay | New file `shared/widgets/avatar_editor.dart` | 2hr | P2 |
| T-032 | **Create `CountryCodeSelector`** — flag + code chip for phone input | New file `shared/widgets/country_code_picker.dart` | 2hr | P2 |

---

## Phase 3 — Missing Screens (New Feature Implementation)

### 3A — Carpool / Rideshare (Flow E) — High Effort

| ID | Task | Dependencies | Effort | Priority |
|----|------|-------------|--------|----------|
| T-033 | **Backend: Add carpool ride type** — extend Ride model with `seatsTotal`, `seatsAvailable`, `perSeatFare`, `isCarpool` flag | Backend `Ride.js` model | 4hr | P2 |
| T-034 | **Backend: Add carpool search endpoint** — `GET /api/rides/carpool/search?from=&to=&date=&seats=` | Backend routes | 4hr | P2 |
| T-035 | **Backend: Add carpool booking endpoint** — `POST /api/rides/carpool/{id}/book` with seat decrement | Backend routes | 3hr | P2 |
| T-036 | **Backend: Add driver carpool publishing** — `POST /api/rides/carpool/publish` | Backend routes | 3hr | P2 |
| T-037 | **E1: "Going the Same Way?" screen** — logo + fields + search + trip results (avatar `08_avatar_sarah_mitchell_carpool.jpg`, rating, price/seat, stepper, seat count tag) | Depends on T-033–036 | 8hr | P2 |
| T-038 | **E2: Sort bottom sheet** — "Sort by" with Price/Departure/Seats filter chips | Depends on T-026 | 3hr | P2 |
| T-039 | **E3: Carpool booking confirmation** — confirm seat selection, payment split | Depends on T-037 | 4hr | P2 |

### 3B — Personalization (Flow C) — Low Effort

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-040 | **C1: Gender selection screen** — optional step after registration, 2 selectable cards (Male/Female), "Done" CTA | 3hr | P2 |

### 3C — Celebration / Confirmation Screens — Low Effort

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-041 | **B4: Verification loading screen** — transitional screen between OTP and next step | 2hr | P2 |
| T-042 | **B7: Welcome confirmation screen** — "Welcome to nice trip" with hand-drawn checkmark | 2hr | P2 |
| T-043 | **G7: Driver "Welcome to Our Family" screen** — approved driver celebratory screen | 2hr | P2 |

### 3D — Courier / Delivery Sub-Flow (Flow D3)

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-044 | **D3: "Types of Deliveries" screen** — "Send an Item" / "Receive an Item" cards (use `05_home_delivery_van_illustration.png`) | 3hr | P3 |
| T-045 | **Backend: Package delivery ride type** — extend Ride model with `packageSize`, `packageWeight`, `isDelivery` | 3hr | P3 |

---

## Phase 4 — Screen Refinements (Align Code → Spec)

### 4A — Rider Home (D1–D2)

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-046 | **Restructure rider home** — replace scrollable vehicle-type gallery with spec Ride / Deliver cards + map | 6hr | P1 |
| T-047 | **Add map to rider home top 35%** — per spec D2 layout (map above fields) | 3hr | P2 |
| T-048 | **Add "12 DRIVERS NEARBY" chip** — secondary pill below the CTA | 30min | P2 |

### 4B — Rider Profile (F1–F5)

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-049 | **Restructure profile as spec F1** — avatar (use `09_avatar_mimmo_profile.jpg`, compressed 512×512) + name + "Member since" + menu rows | 4hr | P2 |
| T-050 | **Add "Personal Information" edit screen** — F2 with Full Name/Email/Phone + Identity/Privacy info cards | 4hr | P2 |
| T-051 | **Add ride history filter tabs** — F5: All/Completed/Cancelled/Refunded pill group; use avatars `10/11/12` for driver rows | 3hr | P2 |
| T-052 | **Add receipt icon + download to ride history** — F5 per-spec receipt button | 2hr | P3 |

### 4C — Wallet & Payments (I1–I6)

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-053 | **Verify wallet header color** — confirm if spec black `#000000` or code brand color is correct | 1hr | P2 |
| T-054 | **Add numeric keypad to top-up** — replace text input with spec I3 keypad | Depends on T-029 | 4hr | P2 |
| T-055 | **Add card type dropdown** — I4: "Choose one" dropdown for Card Type field | 1hr | P2 |
| T-056 | **Implement receipt ticket card** — I6: scalloped card with checkmark + total | Depends on T-030 | 3hr | P3 |

### 4D — Driver Home (H1–H3)

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-057 | **Add "TOP RATED USER" ribbon** — H1: gray ribbon header on premium request cards | 1hr | P1 |
| T-058 | **Add orange "Accept Premium Ride" CTA** — H1: orange button for premium requests | 30min | P1 |
| T-059 | **Add premium member badge** — H3: "Premier Plus Member" tag on rider card in New Request | 30min | P2 |
| T-060 | **Add surge pricing display** — H3: "Includes $2.00 surge" in orange on fare tile | 30min | P2 |
| T-060a | **Wire driver dashboard request card avatars** — use `15/16/17` avatar images in request cards | Depends on T-010k | 30min | P1 |

### 4E — Auth Screens (B1–B3)

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-061 | **Add country code chip to phone input** — B2: flag + "+1" chip adjacent to phone field | Depends on T-032 | 2hr | P1 |
| T-062 | **Replace OTP text field with split boxes** — B3: 4×56px square OTP input | Depends on T-027 | 2hr | P1 |

---

## Phase 5 — Cross-Cutting Improvements

| ID | Task | Effort | Priority |
|----|------|--------|----------|
| T-063 | **Add deep link / FCM notification routing** — notification data → navigate to `/ride-chat/:id` or `/driver/request/:id` | 4hr | P2 |
| T-064 | **Add semantic labels to all icons** — audit `Icon(Icons.*)` usage, add `semanticLabel` | 6hr | P3 |
| T-065 | **Replace hardcoded `SizedBox` spacing with design tokens** | 8hr | P3 |
| T-066 | **Consolidate error display pattern** — pick one: inline error banner across all screens | 4hr | P2 |
| T-067 | **Add background polling for ride status** — 15s timer on passenger home to refresh active ride | 2hr | P2 |
| T-068 | **Add pull-to-refresh to admin dashboard** | 1hr | P2 |
| T-069 | **Replace all placeholder.png with design assets** — use images from design_images folder per mapping in T-010a through T-010j | Various | 4hr | P1 |
| T-070 | **Add optimistic UI for ride acceptance** — update state immediately, revert on error | 4hr | P2 |

---

## Effort Summary

| Phase | Tasks | Total Effort | Priority Mix |
|-------|-------|-------------|--------------|
| Phase 0 — Design Tokens | 10 | ~10hr | 2 P0, 4 P1, 3 P2, 1 P3 |
| Phase 0B — Image Assets | 12 | ~5hr | 1 P0, 2 P1, 8 P2, 1 P4 |
| Phase 1 — UX Bugs | 14 | ~13hr | 3 P0, 6 P1, 4 P2, 1 P3 |
| Phase 2 — Component Lib | 8 | ~17hr | 0 P0, 3 P1, 4 P2, 1 P3 |
| Phase 3 — Missing Screens | 13 | ~43hr | 0 P0, 0 P1, 9 P2, 3 P3, 1 P4 |
| Phase 4 — Screen Refinements | 21 | ~46.5hr | 0 P0, 5 P1, 14 P2, 3 P3 |
| Phase 5 — Cross-Cutting | 8 | ~31hr | 0 P0, 1 P1, 4 P2, 2 P3, 1 P4 |
| **Total** | **86** | **~165.5hr** | **6 P0, 21 P1, 46 P2, 14 P3, 2 P4** |

**Recommended sprint plan:**
- Sprint 1 (2 weeks): Phase 0 + Phase 0B + Phase 1 (P0+P1 items) — ~40hr
- Sprint 2 (2 weeks): Phase 1 (remaining) + Phase 2 — ~35hr
- Sprint 3 (2 weeks): Phase 4A + 4E (rider home + auth refinements) — ~30hr
- Sprint 4+ (2 weeks each): Phase 3 (carpool feature) + remaining Phase 4 + Phase 5

---

*Generated from Figma spec (40 screens) vs codebase (132 lib/ files) cross-reference*
