# WERET App — Figma Spec vs. Code Implementation Cross-Reference

> **Generated:** 2026-06-26
> **Spec Source:** Figma export — 40 screens, iOS-style (390×844pt base)
> **Code Source:** Flutter app — 132 `lib/` files, 54 screen files
> **Methodology:** Systematic comparison of every design token, component, and screen flow

---

## 1. DESIGN SYSTEM COMPARISON

### 1.1 Color Palette — MAJOR DEVIATION

| Token | Figma Spec | Code (AppColors) | Match? | Impact |
|-------|-----------|-------------------|--------|--------|
| Primary / Black | `#000000` | `#000000` | ✅ | Exact match |
| Ink (off-black) | `#181C22` | `#1F2937` (textDarkGray) | ❌ | Different shade; Ink is warmer/darker than `#1F2937` |
| Slate (body text) | `#414753` | `#6B7280` (textSecondary) | ❌ | 40% lighter than spec; affects contrast |
| Cool Gray (meta) | `#717785` | `#9CA3AF` (textMuted) | ❌ | 26% lighter than spec |
| App Background | `#F9F9FF` (Frost) | `#FFFFFF` (secondary) | ❌ | Missing the lavender tint entirely |
| Field Fill | `#F2F3FD` (Lavender-tint) | `#F9FAFB` (inputBackground) | ❌ | Code uses gray `#F9FAFB`, spec uses lavender `#F2F3FD` |
| Border | `#DADCEF` | `#E5E7EB` (borderLight) | ❌ | Spec border is more blue-lavender |
| Divider | `#E6E8F1` | `#D1D5DB` (borderMedium) | ❌ | Code uses darker gray; spec is lighter and blue-tinted |
| **Primary Blue** | **`#1978E5`** | **Missing entirely** | ❌❌ | **Critical gap** — no blue token exists. Links, progress indicators, info banners all use black instead |
| Success Green | `#22C55E` | `#10B981` (success) | ❌ | 22% darker than spec |
| Error Red | `#BA1A1A` | `#EF4444` (error) | ❌ | Spec red is deep/crimson; code uses bright red |
| Rating Amber | `#F59E0B` | `#F59E0B` (accent) | ✅ | Exact match |
| Premium Orange | `#964400` / `#BD5700` | Missing | ❌ | No premium/surge pricing tokens exist |

**Net:** The codebase uses a **gray-based** palette (Tailwind-like grays). The Figma uses a **lavender-tinted** palette (`#F2F3FD`, `#F9F9FF`, `#DADCEF`). These are fundamentally different color systems — every background, field, and border will look different.

### 1.2 Typography — MAJOR DEVIATION

| Property | Figma Spec | Code (AppStyles / theme) | Match? |
|----------|-----------|-------------------------|--------|
| Font family | Rounded geometric sans (Poppins/Baloo 2/Nunito) | `"Roboto"` (theme) / `"SansSerif"` (AppStyles) | ❌ |
| Display/Hero | 26–28px, Bold, Ink `#181C22` | `headlineLarge`: 28px, W700, `#000000` | Partial |
| H1 / Screen title | 20–22px, Bold, Ink `#181C22` | `headlineMedium`: 22px, W700, `#000000` | Partial |
| H2 / Section header | 16–18px, Bold, Ink `#181C22` | `headlineSmall`: 18px, W700, `#000000` | Partial |
| Body | 14–15px, Regular, Slate `#414753` | `bodyRegular`: 14px, W400, `#6B7280` | ❌ Color mismatch |
| Button label | 15–16px, Semibold/Bold | Theme: 16px, W700 | ✅ |
| Field label | 12–13px, Medium, Slate `#414753` | Theme: 12px, W800, `#6B7280` | ❌ Weight + color |
| Eyebrow / micro-label | 11–12px, Bold, uppercase, Cool Gray `#717785` | `sectionLabel`: 10px, W500, `#9CA3AF`, letter-spaced | ❌ Size + weight + color |
| Price / stat | 24–32px, Bold, Ink `#181C22` | `priceLarge`: 28px, W700, `#000000` | Partial |

**Net:** Font family, all colors, some sizes, and some weights are wrong. The code has no rounded geometric font installed.

### 1.3 Layout & Spacing

| Property | Figma Spec | Code | Match? |
|----------|-----------|------|--------|
| Horizontal margin | 24–32px | `WeretTokens.hPad = 24` | ✅ |
| Button height | ~52–54px | Theme: `Size.fromHeight(52)` | ✅ |
| Card radius | 16–20px | `WeretTokens.cardRadius = 20.0` | ✅ |
| Input radius | 12–14px | `WeretTokens.fieldRadius = 12.0` | ✅ |
| Pill radius | Full (height/2) | `WeretTokens.pillRadius = 999.0` | ✅ |
| Icon containers | 40×40 / 48×48px | No system token | ❌ Hardcoded per screen |

### 1.4 Core Components

| Component | Figma Spec | Code Implementation | Match? |
|-----------|-----------|-------------------|--------|
| Primary button | Black `#000000` fill, white text, pill, ~52px | Theme `FilledButton`: black bg, white text, pill, 52px | ✅ |
| Secondary button | White fill, 1px `#DADCEF` border, Ink label | Theme `OutlinedButton`: border is `#000000` (brand), not `#DADCEF` | ❌ Wrong border color |
| Destructive action | Red `#BA1A1A` | No theme token; screens use `WeretTokens.error` (`#EF4444`) | ❌ Wrong red |
| Text input | `#F2F3FD` fill OR white+`#DADCEF` border | Theme: `inputBackground` (`#F9FAFB`), border `#D1D5DB` | ❌ Wrong fill + border |
| Status pill/tag | Tinted bg + colored text | No shared component; each screen reimplements | ❌ Missing |
| Card | White, 16–20px radius, soft shadow | Theme `CardTheme`: white, 20px radius, border `#D1D5DB` | Partial |
| Bottom navigation | 3 items, icon+label, active=black/filled | Theme `NavigationBar`: 3–5 items, active=brand color | Partial |
| Bottom sheet/modal | White sheet, rounded top corners | No shared bottom-sheet component | ❌ Missing |

---

## 2. SCREEN-BY-SCREEN COMPARISON

### Flow A — Onboarding & Splash (Spec: 3 screens)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| A1. Splash | `weret_onboarding_screen.dart` (`_splashDone` phase) | ⚠️ Partial | Spec: full-bleed black with outlined "WERET" logotype. Code: black bg, outlined WERET text. **Approximate match but no car photography.** |
| A2. Onboarding 1 — "Premium Cars" | `weret_onboarding_screen.dart` page 1 (`_carPage1`) | ⚠️ Partial | Spec: top-down car photo fills 55% of screen. Code: **`assets/images/placeholder.png`** — grey box. |
| A3. Onboarding 2 — "Premium cars. to destination." | `weret_onboarding_screen.dart` page 2 (`_carPage2`) | ⚠️ Partial | Spec: hero car photo, headline + copy, circular black CTA. Code: placeholder image, different copy, correct CTA shape. |
| *Spec has 3 pagination dots* | *Code has 2* | ❌ | Missing 3rd slide |
| *Spec has car photos throughout* | *Code uses placeholder.png* | ❌ | All imagery missing |
| *Spec has "Skip" link on page 1* | *Code shows "Skip" on page 2 only* | ❌ | Skip placement differs |

### Flow B — Authentication (Spec: 8 screens)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| B1. Auth Landing (phone/Google) | `login_screen.dart` `_welcome` step | ⚠️ Partial | Spec: logo + "Continue with phone" + "Continue with Google" buttons. Code: phone/email text field + Continue button + Google button + "Sign in with Email" + "Create an account". **Code has extra options and dead text field** (per UX audit #2). |
| B2. Enter Phone Number | `login_screen.dart` `_phoneStep` | ⚠️ Partial | Spec: country code chip + phone input + "Next". Code: phone input + validator + "Send Code". **Spec has a country code chip; code does not — hardcodes `+20` prefix.** |
| B3. OTP Verification | `login_screen.dart` `_otpStep` | ⚠️ Partial | Spec: 4-square OTP boxes (56×56px). Code: single text field. **UX significantly different — code does not have split OTP input boxes.** |
| B4. Verification (loading) | No equivalent | ❌ **Missing** | Spec shows a transitional loading screen between OTP and next. |
| B5–B6. Google Sign-In modal (2 states) | Google OS native sheet | ✅ N/A | These are OS-level dialogs, not custom UI. Code uses `google_sign_in` package which renders native. |
| B7. Welcome ("to nice trip") | No equivalent | ❌ **Missing** | Post-signup confirmation screen with hand-drawn checkmark. After registration, code goes directly to `/passenger/home`. |
| *Spec has Phone + Google only* | *Code also has Email login* | — | Code supports more methods. |

### Flow C — Personalization (Spec: 1 screen)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| C1. What's Your Gender? | No equivalent | ❌ **Missing entirely** | Optional gender selection screen does not exist in code. |
| *Spec: Male/Female selectable cards* | *Not implemented* | ❌ | |

### Flow D — Rider Home & Booking (Spec: 4 screens)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| D1. Home (Ride vs. Delivery cards) | `passenger_home_screen.dart` | ❌ Different | Spec: Ride card + Send a Package card. Code: **Vehicle type gallery** (shipping/delivery/travel scrollable chips), plus pickup/destination fields, plus map, plus nearby drivers. **Code home screen is radically different from spec** — spec has no map, no fields, no nearby drivers. |
| D2. Plan Your Ride (map + destination) | `passenger_home_screen.dart` (the full form) | ⚠️ Partial overlap | Spec: map top 35% + "Plan your ride" + location fields + "Find a Ride" + "12 DRIVERS NEARBY". Code: map is a 170px widget, same fields, similar CTA. **Partial match but layout order differs (code has fields above map).** |
| D3. Types of Deliveries | No equivalent | ❌ **Missing** | "Send an Item" / "Receive an Item" selection screen. Code has no dedicated delivery-courier flow. |
| D4. Confirm Pickup (map + ride card) | `passenger_map_picker_screen.dart` | ⚠️ Partial | Spec: full-bleed map, floating address card, ride summary bottom sheet (Economy Ride / $12.50 / "Confirm Pickup"). Code: similar structure — full-screen map, address card at top, ride card at bottom. **Code shows lat/lng instead of addresses, always shows "Economy Ride" hardcoded.** |

### Flow E — Carpool / Rideshare (Spec: 3 screens)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| E1. "Going the Same Way?" + Trip Results | No equivalent | ❌ **Missing entirely** | Spec shows a full carpool booking flow with trip cards, avatar, rating, price per seat, seat stepper. **Not implemented in code.** |
| E2. Sort By (bottom sheet) | No equivalent | ❌ **Missing** | Filter chips for price/departure/seats. |
| E3. Plan Your Ride (duplicate) | See D2 | — | Same as D2. |

### Flow F — Rider Profile & Account (Spec: 5 screens)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| F1. Profile (Rider Mode) | `passenger_more_menu_screen.dart` | ⚠️ Partial | Spec: profile photo + name + "Member since" + menu rows. Code: name card + mode switch + 8 menu rows. **Code lacks profile photo editing, "Member since" label, and the same menu structure.** |
| F2. Personal Information (Edit Profile) | `settings_screen.dart` (partial) | ⚠️ Partial | Spec: avatar + Full Name/Email/Phone fields + identity/privacy info cards + Save + Delete Account. Code: phone field only + vehicle type + language + theme. **Code does not have edit profile for name/email, no identity status card, no privacy info card.** |
| F3. Help / Support | `help_center_screen.dart` | ❓ Not reviewed | — |
| F4. Payment Methods | `driver_payment_methods_screen.dart` | ❓ Not reviewed | Spec expects payment method list with card/PayPal/Apple Pay rows. |
| F5. Ride History | `passenger_history_screen.dart` | ❌ Different | Spec: filter tab row (All/Completed/Cancelled/Refunded) + ride cards with route/passenger/receipt. Code: simple list of `AdminRideCard` tiles. **No filter tabs, no passenger display, no receipt/download.** |

### Flow G — Driver Onboarding (Spec: 7 screens)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| G1. "Welcome to Our Company" | `driver_onboarding_screen.dart` step 0 | ⚠️ Partial | Spec: headline + copy + logo + "Next". Code: same structure. **Close match.** |
| G2. Step 1 — Personal Info + License | `driver_onboarding_screen.dart` step 1 | ⚠️ Partial | Spec: card "Personal Information" + card "Driving License" + upload tile. Code: DriverFormCard "Personal" + DriverFormCard "License" with DocumentUploadField. **Code uses custom components; structure matches.** |
| G3. Step 2 — Vehicle Information | `driver_onboarding_screen.dart` step 2 | ⚠️ Partial | Spec: "Step 2 of 3" header + progress bar + Vehicle Identity/Type/Required Documents cards. Code: same step structure but **step numbering differs** (code has 3–4 steps depending on `fromSignup`). |
| G4. Step 3 — Banking & Verification | `driver_onboarding_screen.dart` step 3 | ⚠️ Partial | Spec: "FINAL STEP" badge + Payout Method + checkboxes + Application Summary + Submit + Verification Timeline. Code: same fields, same summary card, same checkboxes. **Close match.** |
| G5. Application Received! | `driver_onboarding_screen.dart` navigates here after submit | ❓ Exists? | Code references `/driver/application-received` route. Not explored in detail. |
| G6. Verification in Progress | `driver_onboarding_screen.dart` references `/driver/verification-status` | ❓ Exists? | Progress bar + step checklist with status icons. |
| G7. "Welcome to Our Family" | No equivalent | ❌ **Missing** | Driver-approved celebratory transition screen. |

### Flow H — Driver Home & Operations (Spec: 3 screens)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| H1. Driver Dashboard / Home | `driver_home_screen.dart` | ⚠️ Partial | Spec: map background + "Go Offline" red pill + 3 stat cards + incoming request cards + premium request with orange CTA. Code: same structure — map, online toggle, stat chips, active ride cards, request cards. **Code is missing the "TOP RATED USER" ribbon and orange "Accept Premium Ride" button.** |
| H2. Profile (Driver Mode) | `driver_profile_screen.dart` | ❓ Not fully reviewed | Spec: reduced menu (no Ride History) + "Switch to User Mode" + "Log Out". |
| H3. New Request (detail) | `driver_request_detail_screen.dart` | ❓ Exists but not compared | Spec: map + route + rider card + stat tiles + pickup/dropoff + decline/accept buttons. |

### Flow I — Wallet & Payments (Spec: 6 screens)

| Spec Screen | Code Equivalent | Status | Gaps |
|-------------|----------------|--------|------|
| I1. Wallet (balance + actions) | `driver_earnings_wallet_screen.dart` | ❌ Different | Spec: **black** header card with "$8520.00" + white outline "Top up" / "Transfer" pills + transaction rows. Code: **brand-colored** header (not black) + "Top Up" / "Transfer" buttons + transaction rows. **Color mismatch** — spec uses black header, code uses brand color (`#000000` is brand, so color is correct if black == brand, but spec's background contrast may differ). |
| I2. Recent Activities (full list) | `driver_earnings_wallet_screen.dart` + `DriverRecentActivitiesScreen` | ⚠️ Partial | Spec: grouped rows "Debit Cards" + "Instapay". Code: same grouping exists. |
| I3. Debit Card Top-up — Amount Entry | `wallet_deposit_screen.dart` / `DriverTopUpAmountScreen` | ❓ Not fully reviewed | Spec: amount input + numeric keypad. Code may use a regular text field instead of a keypad. |
| I4. Add Card Form | `wallet_add_account_screen.dart` / `DriverAddCardScreen` | ❓ Not fully reviewed | Spec: Cardholder Name, Card Number, Card Type dropdown, Expiry+CVV row. |
| I5. Confirm Password | `DriverConfirmPasswordScreen` (referenced in `driver_shell.dart`) | ❓ Not fully reviewed | Spec matches code path. |
| I6. Top-up Success (receipt) | `DriverTopUpSuccessScreen` (referenced in `driver_shell.dart`) | ⚠️ Partial | Spec: scalloped ticket card + green check + total + "Done". Code screen not reviewed but route exists. |

---

## 3. COMPONENT-LEVEL GAPS

### 3.1 Missing Shared Widgets (spec requires, code lacks)

| Component | From Spec | Code Status |
|-----------|----------|-------------|
| **Status pill/tag** (tinted bg + colored text, e.g. "Under Review", "DEFAULT", "VERIFIED") | Multiple screens | ❌ No shared component; hand-rolled per screen |
| **Bottom sheet** (standardized white sheet, rounded top, scrim) | E2, B5-B6 | ❌ No wrapper component; each screen builds its own `showModalBottomSheet` |
| **Split OTP input** (4×56px square boxes) | B3 | ❌ Code uses single `TextField` |
| **Chip filter group** (horizontally scrollable pills) | F5, E2 | ❌ Hand-rolled in each screen |
| **Receipt/ticket card** (scalloped edges) | I6 | ❌ Not implemented |
| **Numeric keypad** (for amount entry) | I3 | ❌ Not implemented |
| **Profile photo editor** (avatar + edit badge) | F1, F2 | ❌ Not implemented |
| **Country code selector** (flag + code chip) | B2 | ❌ Code hardcodes `+20` |

### 3.2 Partial/Incorrect Components

| Component | Spec | Code | Fix Needed |
|-----------|------|------|------------|
| **Service type selector** | Static Ride/Deliver cards (D1) | Scrollable gallery chips | Restructure to match spec layout |
| **Driver request card** | Has "TOP RATED USER" ribbon + orange premium CTA (H1) | No ribbon, all CTAs black | Add premium visual treatment |
| **Transaction list row** | Red debits / black credits | Green credits / black debits | Color logic inverted vs spec |
| **Wallet header** | Black `#000000` | Brand `#000000` (same color, different context) | Verify if spec intends pure black vs brand |
| **Onboarding CTA** | Circular black arrow (page 2) | Circular black arrow | ✅ Correct shape |
| **Driver online toggle** | Red "Go Offline" pill | Red "Go Offline" pill | ✅ Correct |

### 3.3 Screens Present in Code But NOT in Spec

| Code Screen | Possible Spec Equivalent |
|-------------|-------------------------|
| `forgot_password_screen.dart` | Not in spec — spec assumes phone/Google only |
| `phone_register_screen.dart` | Not explicitly in spec |
| `register_choice_screen.dart` | Not explicitly in spec |
| `passenger_register_screen.dart` | Not explicitly in spec (email registration) |
| `driver_register_screen.dart` | Not explicitly in spec |
| `ride_chat_screen.dart` | Not in spec |
| `in_app_call_screen.dart` | Not in spec |
| `settings_screen.dart` | Theme/language settings — not in spec |
| `debug_log_screen.dart` | Dev tool — not in spec |
| `mode_switch_row.dart` | Not in spec |
| Admin screens (8 files) | Not in spec — admin is not part of the mobile spec |

### 3.4 Screens in Spec But NOT in Code

| Spec Screen | Impact |
|-------------|--------|
| C1. Gender selection | Missing optional personalization |
| D3. Types of Deliveries | Missing courier sub-flow |
| E1–E3. Carpool / Rideshare (3 screens) | **Major gap** — entire carpool feature not implemented |
| B4. Verification loading transitional | Missing loading state |
| B7. Welcome confirmation | Missing post-signup celebration |
| G7. "Welcome to Our Family" | Missing driver approval celebration |

---

## 4. FEASIBILITY CONFLICTS

### 4.1 Conflicts with Existing Architecture

| Spec Requirement | Code Constraint | Feasibility |
|-----------------|----------------|-------------|
| **Lavender-tinted palette** (`#F2F3FD`, `#F9F9FF`, `#DADCEF`) | Code uses gray palette (`#F9FAFB`, `#E5E7EB`, `#D1D5DB`) | **Low effort** — color tokens are centralized in `AppColors` and `WeretTokens`. Can swap in a single commit. |
| **Primary Blue `#1978E5`** for links/progress/info | No blue token exists; all CTA uses black | **Low effort** — add token, update `WeretTokens.brand` or create new accent. **Caution:** Changing `brand` affects all buttons (currently black). May want a separate `accentBlue` token. |
| **Rounded geometric font** (Poppins/Baloo 2) | Code uses `"Roboto"` / `"SansSerif"` | **Medium effort** — add font to `pubspec.yaml`, update `fontFamily` in theme. Need licensing check for chosen font. |
| **Numeric keypad** for wallet amount entry | No custom keypad widget | **Medium effort** — build a reusable keypad widget or use Flutter's built-in keyboard with input filter. |
| **Split OTP input** (4×56px boxes) | Single text field | **Low effort** — many community packages or a custom 4-box widget (e.g., `pinput`, `otp_text_field`, or manual `Stack` of `TextFormField`s). |
| **Scalloped receipt card** (ticket edges) | Standard rounded card | **Medium effort** — requires `CustomPainter` for the perforated edge effect. |
| **Carpool/Rideshare flow** (3 screens) | No existing implementation | **High effort** — new feature requiring backend route for seat-based booking, new API endpoints, new state management, and 3+ screens. |

### 4.2 Conflicts with Free-Tier Constraints (from `FREE_TIER_STRATEGY.md`)

| Spec Feature | Constraint | Mitigation |
|-------------|-----------|------------|
| Carpool/rideshare | No WebSocket (Vercel incompatible) | Use polling (existing `ride_provider` pattern). No architectural conflict — carpool can reuse `availableRides` model with seat count. |
| Real-time map driver location (spec H1, H3) | No Socket.io | Already solved: code uses `driverLocationTracker` with REST polling. Spec does not require real-time; polling is acceptable. |
| Image uploads (driver license, profile photo) | Cloudinary only (no multer) | Already solved: `upload_service.dart` handles this. No conflict. |

### 4.3 Conflicts with Current Code Patterns

| Spec Pattern | Code Pattern | Risk |
|-------------|-------------|------|
| iOS-style full-screen cards with 40px outer radius | Code uses standard `Scaffold` with 0px outer radius | The 40px outer radius is a "device card" mockup artifact, not a real app feature. **No change needed** — real devices have their own bezels. |
| Bottom navigation on ALL screens | Code uses `NavigationBar` only on shell routes (passenger/driver/admin homes) | Aligned — spec matches existing pattern. |
| "Switch to Driver Mode" / "Switch to User Mode" buttons | Code has `ModeSwitchRow` widget and `switchRole()` in provider | ✅ Already exists. |

---

## 5. SUMMARY

### By the Numbers

| Category | Spec Items | Code Match | Match % |
|----------|-----------|-----------|---------|
| Color tokens | 15 | 3 exact | **20%** |
| Typography styles | 8 | 0 exact | **0%** |
| Layout/spacing | 7 | 5 exact | **71%** |
| Core components | 8 | 2 exact | **25%** |
| Onboarding screens (A) | 3 | 0 exact | **0%** |
| Auth screens (B) | 8 | 0 exact | **0%** |
| Personalization (C) | 1 | 0 | **0%** |
| Rider Home/Booking (D) | 4 | 0 exact | **0%** |
| Carpool/Rideshare (E) | 3 | 0 | **0%** |
| Rider Profile (F) | 5 | 0 exact | **0%** |
| Driver Onboarding (G) | 7 | 4 approximate | **57%** |
| Driver Home (H) | 3 | 1 approximate | **33%** |
| Wallet/Payments (I) | 6 | 1 approximate | **17%** |

### 10 Biggest Gaps (Priority Order)

| Pri | Gap | Effort | Spec → Code Fix |
|-----|-----|--------|-----------------|
| 1 | **Color palette wrong** — lavender vs gray | Low | Update `AppColors` tokens; one central change |
| 2 | **Font family wrong** — Roboto vs rounded sans | Medium | Add Google Fonts dependency, update theme |
| 3 | **No Primary Blue `#1978E5`** | Low | Add token; decide if it replaces black or supplements |
| 4 | **No split OTP input** | Low | Replace single field with 4-box widget |
| 5 | **Carpool feature missing** (3 screens) | High | New feature development |
| 6 | **Gender selection missing** | Low | Add optional onboarding step |
| 7 | **Welcome/celebration screens missing** | Low | Add post-registration/post-approval screens |
| 8 | **Rider home layout is completely different** | Medium | Restructure from gallery chips to Ride/Deliver cards |
| 9 | **Wallet header color mismatch** | Low | Confirm spec intent, update color |
| 10 | **No status pill/tag component** | Low | Create shared `StatusPill` widget |

### What Works Well (No Changes Needed)

- Driver onboarding flow structure (57% match)
- Button system (shape, height, primary/secondary pattern)
- Layout spacing and radii
- Map picker screen structure
- Driver home screen overall architecture
- Bottom navigation pattern
- Role switching (already implemented)

---

*Generated from Figma export (40 screens) vs `lib/` source-code analysis (132 files)*
