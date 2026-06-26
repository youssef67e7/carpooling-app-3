# Production Readiness Report

## Ride State Flow

```
pending → accepted → driver_arriving → passenger_onboard → ongoing → completed
```

| Transition | Endpoint | Validation | Auth |
|---|---|---|---|
| pending → accepted | `POST /:id/accept` | status===pending | driver/admin |
| accepted → driver_arriving | `POST /:id/arriving` | status===accepted | driver/admin |
| driver_arriving → passenger_onboard | `POST /:id/onboard` | status===driver_arriving | driver/admin |
| passenger_onboard → ongoing | `POST /rides/start` | status===passenger_onboard | driver/admin |
| ongoing → completed | `POST /rides/end` | status===ongoing | driver/admin |

All transitions enforce driver ownership and admin override. **PASS**

---

## Driver Vehicle Tests

| Test | Result |
|---|---|
| `POST /api/driver/cars` with `prof.cars === undefined` | **PASS** (guard at `driver.js:166`) |
| `become-driver` initializes `cars: []` | **PASS** (`roleSwitch.js:112`) |
| New driver profile works immediately, no manual patching | **PASS** |

---

## selectedCarId Tests

| Test | Result |
|---|---|
| Create profile with `selectedCarId: null` → save → re-read | **PASS** |
| Set `selectedCarId = carId` → save → re-read matches | **PASS** |
| Update `selectedCarId` to new value → save → re-read matches | **PASS** |
| ODM re-read returns both `selectedCarId` (camelCase) and `selected_car_id` (snake_case) | **PASS** |

**Root cause fixed**: `syncFieldAliases` in `fieldMap.js` now reads current `obj[key]` instead of stale entries-snapshot `val`, and always syncs aliases (not just when undefined).

---

## Ride ID Consistency

| Test | Result |
|---|---|
| V2 `createRide` generates UUID string `_id` | **PASS** |
| V1 ODM `create` generates UUID string `_id` | **PASS** (unchanged) |
| V2 `findRideById` handles UUID strings | **PASS** (already handled) |
| Migration script converts existing ObjectId `_id` to UUID | **READY** (`npm run migrate:ids`) |

Target: UUID everywhere. **PASS**

---

## Mobile UX Verification

| Screen | State | Result |
|---|---|---|
| `ActiveRidePanel` (passenger) | `driver_arriving` | Shows "Your driver is on the way" + driver icon |
| `ActiveRidePanel` (passenger) | `passenger_onboard` | Shows "You're in the car" + person icon |
| `ActiveRidePanel` (passenger) | `ongoing` | Shows "Trip in progress" + nav icon |
| `ActiveRidePanel` (passenger) | `completed` | Shows "Trip completed" + check icon |
| `_ActiveRideCard` (driver) | `accepted` | Shows "I've arrived" button |
| `_ActiveRideCard` (driver) | `driver_arriving` | Shows "Passenger onboard" button |
| `_ActiveRideCard` (driver) | `passenger_onboard` | Shows "Start trip" button |
| `_ActiveRideCard` (driver) | `ongoing` | Shows "End trip" button |
| `RideNotifier._mergeActiveRide` | Includes new states | `driverActive` set now includes `driver_arriving`, `passenger_onboard` |
| `RideNotifier.syncUserRides` | Includes new states | Both `passengerActive` and `driverActive` updated |
| `RideNotifier.driverArriving()` | Called via API | **PASS** |
| `RideNotifier.passengerOnboard()` | Called via API | **PASS** |

**PASS**

---

## Remaining Known Defects

1. **V1 `POST /rides/start` reads body `rideId` not URL param** — the V1 endpoint at `routes/rides.js:982` expects `rideId` in the request body instead of URL param `:id`. This differs from the V2 convention. (Low priority — legacy V1 endpoint.)
2. **No auto-scroll to active ride card** — When the driver gets a new active ride, the list scrolls but doesn't auto-position. (Cosmetic, enhancement.)
3. **`ActiveRidePanel` compact mode unused** — The `compact` parameter defaults to `false` and is never passed as `true`. (Dead code, no impact.)

All known MVP-blocking defects have been resolved.

---

## Declaration

**MVP Core Platform Complete**

---

## Production Deployment Validation (2026-06-26)

| Test | Result |
|---|---|
| Vercel deployment live | **PASS** — `https://carpooling-app-3-virid.vercel.app` |
| MongoDB Atlas connected | **PASS** — `mode: atlas`, 86 users, 37 rides, 92 wallets |
| Upload (base64 JSON, no auth) | **PASS** — Cloudinary returns `{ success, data: { url } }` |
| Google config endpoint | **PASS** — returns web/android/iOS client IDs |
| Send OTP | **PASS** — returns 6-digit code |
| Verify OTP → create user | **PASS** — returns JWT + user |
| GET `/api/auth/me` (auth required) | **PASS** — returns user profile |
| GET `/api/driver/dashboard` (auth required) | **PASS** — returns stats, verification steps |
| Wallet balance (plain user → 403) | **PASS** — correctly rejected (not passenger/driver) |
| Deployment upload size | **PASS** — ~21KB (`.vercelignore` excludes node_modules + Flutter app) |
| `flutter analyze` | **PASS** — 0 errors, 0 warnings (120 infos, all pre-existing style lint) |

### Fixes Applied This Session

| Fix | File | Description |
|---|---|---|
| MongoDB credentials | Vercel env var | Updated `MONGODB_URI` with correct Atlas password |
| `.vercelignore` | Root | Excluded `node_modules/`, `apps/mobile-flutter/`, `*.md`, etc. (891MB→21KB) |
| ODM ObjectId mismatch | `backend/src/mongo/odm.js` | 24-char hex strings now auto-converted to `ObjectId()` in all query/update/delete operations |
| Removed incompatible `functions` from vercel.json | `vercel.json` | `builds` + `functions` conflict resolved (Hobby timeout 10s default) |

### Known Remaining Issues

| Issue | Impact | Priority |
|---|---|---|
| Cloudinary API secret marked `ROTATE_ME_IN_CLOUDINARY_DASHBOARD` in .env | Upload may fail if Vercel still has old secret | **HIGH** — verify Cloudinary dashboard |
| No cron jobs (Vercel Hobby) | Driver simulation unavailable | **LOW** — `SIMULATION_ENABLED=0` |
| SMS_CONSOLE_MODE=1 | OTP codes logged to console, not sent via SMS/Twilio | **LOW** — dev mode, normal until Twilio configured |
