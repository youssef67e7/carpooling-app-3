# Firestore — WERET (`youssef-f757e`)

## Security rules

Authenticated clients **read** scoped data after `POST /auth/firebase-token` (Firebase custom token).

- **Writes** stay on Express API → Admin SDK (validation, OTP, ride lifecycle)
- Deploy rules from [`firebase/firestore.rules`](../firebase/firestore.rules):

```bash
firebase deploy --only firestore:rules --project youssef-f757e
```

Mobile/web sign in flow:

1. Login via API → JWT
2. `POST /auth/firebase-token` → Firebase custom token (`uid` = user id)
3. Firestore listeners sync wallet, rides, vehicles, admin stats live

## Collections (15 + meta)

| Collection | Purpose |
|------------|---------|
| `users` | Accounts: passenger, driver, admin |
| `passenger_profiles` | Passenger profile |
| `driver_profiles` | Driver status, car, license |
| `driver_documents` | National ID, criminal record images |
| `admin_accounts` | Admin panel login (bcrypt) |
| `phone_login_otps` | Phone OTP hashes |
| `vehicles` | Service types (delivery, travel, …) + fares |
| `rides` | Trips |
| `bookings` | Seat pooling |
| `messages` | Ride chat |
| `wallet_accounts` | Wallets |
| `transactions` | Ledger |
| `withdrawal_requests` | Withdraw flow |
| `reports` | User reports |
| `admin_audit_logs` | Admin audit trail |
| `_meta/schema` | Schema version & collection list |

Document `id` = UUID string (`_id` in MongoDB).

Fields use **snake_case** in Firestore (`created_at`, `user_id`, `firebase_uid`, …).

## Initialize cloud data (one time)

1. Firebase Console → **Firestore** → Create database (production mode, region of your choice)
2. `backend/.env`:

```env
FIREBASE_PROJECT_ID=youssef-f757e
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
UPLOAD_STORAGE=local
```

3. Run:

```bash
cd backend
npm install
npm run init:firestore
```

This writes `_meta/schema` and seeds:

- **6 vehicle types** (shipping, delivery, travel, …)
- **Admin accounts** (from `ADMIN_PASSWORD_*` in `.env`)
- **6 mock drivers** (`driver1@demo.local` / `driver123`, …)

4. Start API (auto-seeds on first boot too):

```bash
npm run dev
```

`GET /health` → `"firebase": true`

## users — main fields

| Field | Type | Notes |
|-------|------|-------|
| `name`, `email`, `password` | string | |
| `role` | passenger \| driver \| admin | |
| `active_role` | passenger \| driver | |
| `phone`, `profile_image_url` | string | |
| `location` | `{ lat, lng }` | |
| `vehicle_type` | string | |
| `is_verified`, `is_blocked`, `is_online` | boolean | |
| `firebase_uid`, `google_sub` | string | optional |
| `driver_application_status` | none \| pending \| approved \| rejected | |

See [`backend/src/mongo/schema.js`](../backend/src/mongo/schema.js) for MongoDB collection names and field mapping.

## Flutter

App uses **REST API** only — not direct Firestore reads. Rules stay locked.

Optional: `cloud_firestore` in Flutter for future features; keep rules closed until you add authenticated rules.
