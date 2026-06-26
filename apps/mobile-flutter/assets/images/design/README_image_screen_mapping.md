# WERET App — Image Assets & Placement Map

This folder contains every **photographic / raster image** embedded in the original Figma export (`Untitled.zip`). These are the only elements in the design that are actual images (not vector icons/illustrations and not text) — meaning they are the assets a developer will need to **source, license, or replace** when building the real app. Everything else in the UI (icons, the logo, illustrations, buttons, maps' UI chrome) is vector and gets rebuilt in code/SVG, not as an image file.

Images were extracted at their **original embedded resolution** (full quality, no compression loss from the design file), not screenshotted off the canvas — so these are the actual source files the designer placed.

Screen numbers refer to the same numbering used in `WERET_App_Design_Specification.md` (Flow letter + number, e.g. "A2" = Onboarding 1).

---

## Mapping Table

| # | File | What it is | Native size | Used on screen(s) | Notes |
|---|---|---|---|---|---|
| 1 | `01_onboarding2_car_front_suv.png` | Photo — black SUV (Toyota), ¾ front view | 1024×600 | **A3 — Onboarding 2** ("Premium cars. to destination.") | Hero image, bleeds off top of frame |
| 2 | `02_onboarding1_car_topview.png` | Photo — car, top‑down view, silver/gray | 1500×1500 | **A2 — Onboarding 1** ("Premium Cars") | Rotated slightly (‑0.66°) in the original layout |
| 3 | `03_google_modal_avatar_a.png` | Stock headshot used as placeholder Google‑account photo | 1600×1600 | **B5/B6 — Google Sign‑In modals** ("Sign in with Google" / "Signing you in") | Tiny (32×32) circular crop on screen |
| 4 | `04_google_modal_avatar_b.jpg` | Stock photo, alternate placeholder for same account row | 1666×2499 | **B5/B6 — Google Sign‑In modals** | Appears layered with #3 at same spot — only one is likely meant to ship |
| 5 | `05_home_delivery_van_illustration.png` | Line‑art delivery van + boxes illustration | 400×400 | **D1 — Home** ("Send a package" card) | Transparent background, can be treated as an icon/illustration asset |
| 6 | `06_map_san_francisco.png` | Real map screenshot (Google Maps style), San Francisco | 512×512 | **D2 — Plan Your Ride**, **E3 — Plan Your Ride (dup)**, **H3 — New Request** | ⚠️ Static screenshot — in production this should be a **live map SDK view** (Google Maps/Mapbox), not a shipped image |
| 7 | `07_map_confirm_pickup_greentint.png` | Stylized blurred/green‑toned map background | 512×512 | **D4 — Confirm Pickup** | Decorative blurred map used purely as backdrop behind the pickup UI |
| 8 | `08_avatar_sarah_mitchell_carpool.jpg` | Stock headshot, woman | 104×104 | **E1 — Going the Same Way?** (trip result card — "Sarah Mitchell") | |
| 9 | `09_avatar_mimmo_profile.jpg` | Stock photo, man taking a phone selfie | 3024×4032 (full‑res phone photo) | **F1 — Profile (rider)**, **F2 — Personal Information**, **H2 — Profile (driver mode)** | Same photo reused as "Mimmo" across all 3 profile screens — largest source file in the set |
| 10 | `10_avatar_marcus_chen_ridehistory.jpg` | Stock headshot, man | 80×80 | **F5 — Ride History** (1st ride — driver "Marcus Chen") | |
| 11 | `11_avatar_sarahjenkins_ridehistory.jpg` | Stock headshot, woman | 80×80 | **F5 — Ride History** (2nd ride — driver "Sarah Jenkins") | Different photo than #15/#18 despite same character name — inconsistency in source file |
| 12 | `12_avatar_davidwilson_ridehistory.jpg` | Stock headshot, man | 80×80 | **F5 — Ride History** (3rd ride — driver "David Wilson") | |
| 13 | `13_hero_driver_steeringwheel_sunset.png` | Photo — hands on steering wheel, sunset through windshield | 512×512 | **G5 — Application Received!** | Large hero/motivational image mid‑page |
| 14 | `14_map_driver_dashboard_nynj.png` | Real map screenshot, Jersey City/Manhattan area | 512×512 | **H1 — Driver Dashboard** | Only covers the top ~⅓ of the screen behind the status header; also a live‑map candidate (see #6) |
| 15 | `15_avatar_sarahjenkins_driverdash.jpg` | Stock headshot, woman | 96×96 | **H1 — Driver Dashboard** (1st ride request — "Sarah Jenkins") | |
| 16 | `16_avatar_michaelross_driverdash.jpg` | Stock headshot, man | 96×96 | **H1 — Driver Dashboard** (2nd ride request — "Michael Ross") | |
| 17 | `17_avatar_elenarodriguez_driverdash.jpg` | Stock headshot, woman | 96×96 | **H1 — Driver Dashboard** (3rd, "Top Rated User" premium request — "Elena Rodriguez") | |
| 18 | `18_avatar_sarahjenkins_newrequest.jpg` | Stock headshot, woman | 128×128 | **H3 — New Request** (rider — "Sarah Jenkins") | Different photo than #11/#15 despite same character name |

---

## Quick Reference — Images Needed Per Screen

| Screen | Image file(s) |
|---|---|
| A2 — Onboarding 1 | `02_onboarding1_car_topview.png` |
| A3 — Onboarding 2 | `01_onboarding2_car_front_suv.png` |
| B5/B6 — Google Sign‑In modals | `03_google_modal_avatar_a.png`, `04_google_modal_avatar_b.jpg` |
| D1 — Home | `05_home_delivery_van_illustration.png` |
| D2 — Plan Your Ride | `06_map_san_francisco.png` |
| D4 — Confirm Pickup | `07_map_confirm_pickup_greentint.png` |
| E1 — Going the Same Way? (results) | `08_avatar_sarah_mitchell_carpool.jpg` |
| E3 — Plan Your Ride (dup) | `06_map_san_francisco.png` |
| F1 — Profile (rider) | `09_avatar_mimmo_profile.jpg` |
| F2 — Personal Information | `09_avatar_mimmo_profile.jpg` |
| F5 — Ride History | `10_avatar_marcus_chen_ridehistory.jpg`, `11_avatar_sarahjenkins_ridehistory.jpg`, `12_avatar_davidwilson_ridehistory.jpg` |
| G5 — Application Received! | `13_hero_driver_steeringwheel_sunset.png` |
| H1 — Driver Dashboard | `14_map_driver_dashboard_nynj.png`, `15_avatar_sarahjenkins_driverdash.jpg`, `16_avatar_michaelross_driverdash.jpg`, `17_avatar_elenarodriguez_driverdash.jpg` |
| H2 — Profile (driver mode) | `09_avatar_mimmo_profile.jpg` |
| H3 — New Request | `06_map_san_francisco.png`, `18_avatar_sarahjenkins_newrequest.jpg` |

**All 22 remaining screens use no photographic images at all** — they're built entirely from vector shapes, icons, and the logo (Splash, both auth/OTP screens, gender select, Types of Deliveries, Sort‑by sheet, Help, Payment Methods, Ride History shell, all 7 Driver Onboarding/Registration screens, Verification in Progress, Welcome to our Family, Wallet, Recent Activities, and all 4 top‑up/payment screens).

---

## Notes & Recommendations

- **Maps (#6, #14):** these are static screenshots in the design file, but a real ride‑hailing app needs a live map. Treat them as **layout placeholders only** — wire up Google Maps SDK / Mapbox / Apple MapKit instead of shipping these image files.
- **Stock avatars (#3, #4, #8, #10–#12, #15–#18):** these are placeholder people photos. For production you'll either license real stock photography, generate avatars, or pull real user‑uploaded profile photos at runtime — none of these specific files should ship as-is in a real release.
- **Mimmo's photo (#9)** is a full 3024×4032 phone photo — much larger than needed for a profile picture; export a properly cropped/compressed version (e.g. 512×512) for production use.
- **Duplicate "Sarah Jenkins"** appears with three different photos (#11, #15, #18) across three different screens — flag this to the design team as a content inconsistency to resolve before development.
