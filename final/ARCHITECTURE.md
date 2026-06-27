# Architecture

## Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js (vanilla, no framework) |
| HTTP server | Express.js |
| Database | MongoDB Atlas (cloud) + in-memory fallback |
| ODM | Custom in-memory ODM (`backend/src/mongo/odm.js`) over native MongoDB driver |
| Frontend (mobile) | Flutter with Riverpod state management |
| Frontend (admin) | Vanilla HTML/JS (`backend/public/admin-ui/`) |
| Maps | OpenStreetMap via `flutter_map` |
| Push notifications | Firebase Cloud Messaging (FCM v1 HTTP API) |
| Email | Nodemailer + Gmail SMTP |
| SMS | Firebase phone auth (blocked — billing not enabled) |
| Auth | JWT (15 min) + refresh tokens (7 days, rotated) |
| Deployment | Vercel (serverless functions) |

## Folder Structure

```
backend/
  src/
    routes/         # Express route handlers (auth, rides, admin, wallet, etc.)
    models/         # ODM model definitions (User, Ride, WalletAccount, etc.)
    mongo/
      odm.js        # Custom ODM — Mongoose-like API over native driver
      queries/      # Low-level native driver queries (users.js, rides.js, etc.)
      schema.js     # ensureMongoIndexes() — all index creation
      client.js     # MongoDB client connection
    middleware/      # authRequired, blockCheck, roleRequired, rateLimiters
    services/       # Business logic: fcmService, walletLedger, driverRating, sendEmail, etc.
    utils/          # signUserToken, logger, googleSignIn helpers, etc.
    errors/         # AppError class
    config/         # fixedAdmins, env config
    schemas/        # express-validator schemas
  scripts/          # init-indexes.js, seed.js
  public/
    admin-ui/       # Vanilla web admin panel

apps/mobile-flutter/
  lib/
    core/
      api/          # ApiClient (Dio), auth_interceptor, api_endpoints
      providers/    # Riverpod providers (auth, ride, wallet, driver, admin)
      services/     # FCM, token manager, session reset, upload, location tracking
      theme/        # WeretTokens design tokens
      utils/        # Logging, navigation, geo helpers
      constants/    # Vehicle types, etc.
    features/
      auth/         # Login, register, settings, screens
      driver/       # Driver-specific screens
      wallet/       # Wallet screens (both roles)
      more/         # Passenger menus, earnings, ratings, cars
      debug/        # Debug log viewer
    shared/
      models/       # WeretUser model
      widgets/      # Reusable widgets (map, buttons, cards, OTP input, etc.)
    l10n/           # English + Arabic translations
    core/router/    # GoRouter configuration (app_router.dart)
```

## Data Flow

### Authentication
1. User submits credentials → `POST /auth/*` → backend validates → creates JWT + refresh token
2. Flutter stores tokens via `TokenManager` (SharedPreferences)
3. Every API call: `AuthInterceptor` attaches `Bearer` token; on 401, auto-refreshes via `POST /auth/refresh`
4. On app start: `hydrate()` calls `GET /auth/me` with stored token → restores session

### Ride Flow (no real-time sockets)
1. Passenger creates ride → `POST /rides/create`
2. Driver polls `GET /rides/available` (or screen refreshes every 15-30s)
3. Driver accepts → `POST /rides/:id/accept` → FCM sent to passenger
4. Driver arrives → `POST /rides/:id/arriving` → FCM to passenger
5. Passenger onboard → `POST /rides/:id/onboard` → FCM to passenger
6. Driver starts trip → `POST /rides/start` → FCM to passenger
7. Driver ends trip → `POST /rides/end` → FCM to both, payment ledger updated

### Wallet
- Transactions recorded in `transactions` collection via `walletLedger.js`
- Passenger wallet accounts + driver earnings share same data model
- Withdrawals require OTP confirmation (2-step)

### Push Notifications
- FCM tokens registered at login via `POST /auth/register-token`
- Backend sends via FCM v1 HTTP API in `fcmService.js`
- Each event has a dedicated `notify*` helper in `notificationHelpers.js`
- Flutter `FcmService` handles foreground (in-app banner), background (tap → ride-chat), and terminated (pending navigation)

## Database

### Collections
| Collection | Purpose | Key Indexes |
|---|---|---|
| `users` | User accounts | email (unique sparse), google_sub (unique sparse), role |
| `rides` | Ride records | passenger_id+status, driver_id+status, 2dsphere |
| `wallet_accounts` | Wallet funding sources | user_id |
| `transactions` | All financial transactions | user_id+created_at |
| `driverProfiles` | Driver-specific data | userId (unique), isOnline+isAvailable, 2dsphere |
| `fcmTokens` | Push notification tokens | userId, token (unique) |
| `notifications` | Stored notifications | userId+createdAt, userId+read |
| `refreshTokens` | JWT refresh tokens | userId, tokenHash (unique), expiresAt (TTL) |
| `adminAuditLogs` | Admin action audit trail | createdAt (TTL 30d) |
| `messages` | Ride chat messages | rideId+createdAt |
| `bookings` | Pooling bookings | rideId |

## Auth Flow

```
Login → generateAccessToken (15min) + generateRefreshToken (7d, 64-byte hex, SHA-256 hashed)
       → store in refreshTokens collection with TTL
       → return both to client

API Call → AuthInterceptor attaches accessToken
         → 401 → auto-call POST /auth/refresh
         → generate new accessToken + rotate refreshToken (delete old, store new)
         → retry original request

Logout → revokeAllRefreshTokens(userId)
       → clear local tokens
```
