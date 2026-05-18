# RideHail — full-stack ride-hailing demo

**Production roadmap (schema, APIs, scaling, phased rollout):** see [`docs/PRODUCTION_ARCHITECTURE.md`](docs/PRODUCTION_ARCHITECTURE.md).

End-to-end **Expo (React Native) + Express + MongoDB** app: JWT auth, ride lifecycle, driver online status, **focused HTTP polling** (ride ~3s, lists ~4–5s) with **screen blur cleanup**, **backend-simulated driver movement**, maps with **user location**, pickup/destination/**assigned driver** markers, **route polyline** (mock interpolation or **Google Directions** when `GOOGLE_DIRECTIONS_API_KEY` is set), **estimated + final fare**, **Redux Toolkit**, **Axios + GET retries**, **Arabic RTL + English**, reusable UI, **light/dark/system** theme, and an **admin dashboard** (stats + dedicated users/rides screens).

## Folder structure

```
ReachNative Car/
├── package.json              # optional: npm run mobile | npm run backend from repo root
├── backend/
│   ├── docker-compose.yml      # optional local MongoDB
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js            # Express + Mongo + movement job
│       ├── jobs/simulateMovement.js
│       ├── seed/seedMockDrivers.js
│       ├── middleware/auth.js, validateRequest.js, errorHandler.js
│       ├── models/User.js
│       ├── models/Ride.js
│       ├── utils/geo.js, directions.js
│       └── routes/
│           ├── auth.js         # register, login, me (+ express-validator)
│           ├── rides.js        # fare + routePath on create; centralized errors
│           ├── driver.js       # toggle-status, location-update (validated)
│           └── admin.js        # users, rides, stats (+ activeRides)
├── mobile/
│   ├── App.js
│   ├── app.json / app.config.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── api/client.js       # axios + GET retry interceptor
│       ├── theme/tokens.js
│       ├── context/ThemeProvider.js
│       ├── hooks/usePolling.js
│       ├── utils/mapCoords.js
│       ├── i18n/, locales/
│       ├── store/ (+ ui slice)
│       ├── navigation/RootNavigator.js
│       ├── screens/ (+ Settings, AdminDashboard/Users/Rides)
│       └── components/ (CustomButton, InputField, RideCard, DriverCard, EmptyState, LanguageBar)
└── README.md
```

## API (implemented)

| Method | Path | Auth | Description |
|--------|------|------|----------------|
| POST | `/auth/register` | — | Register (`name`, `email`, `password`, `role`) |
| POST | `/auth/login` | — | Login |
| GET | `/auth/me` | JWT | Current user |
| GET | `/rides/nearby-drivers` | JWT passenger/admin | Online drivers + locations |
| POST | `/rides/create` | JWT passenger | Create ride (`pickupLocation`, `destinationLocation`, `vehicleType`; optional `passengerMinFare` ≥ suggested) |
| GET | `/rides/available` | JWT driver | Pending rides (hides other drivers’ offers; hides rides awaiting another driver’s confirmation) |
| POST | `/rides/accept` | JWT driver | `{ rideId, proposedFare? }` — driver’s asking price; passenger must accept/reject |
| POST | `/rides/respond-proposal` | JWT passenger | `{ rideId, accept }` — accept/reject driver’s price; if accept, driver must confirm |
| POST | `/rides/passenger-min-fare` | JWT passenger | `{ rideId, passengerMinFare }` — update minimum offer while pending (≥ suggested) |
| POST | `/rides/driver-confirm-booking` | JWT driver | `{ rideId, accept }` — after passenger accepted your price, confirm or decline the trip |
| POST | `/rides/start` | JWT driver | `{ rideId }` |
| POST | `/rides/end` | JWT driver | `{ rideId }` |
| GET | `/rides/history` | JWT | Passenger / driver / admin scope |
| GET | `/rides/:rideId` | JWT | Single ride (polling) |
| POST | `/driver/toggle-status` | JWT driver | Flip `isOnline` |
| POST | `/driver/location-update` | JWT driver | `{ lat, lng }` |
| GET | `/admin/users` | JWT admin | List users |
| GET | `/admin/rides` | JWT admin | List rides |
| GET | `/admin/stats` | JWT admin | totalUsers, totalRides, driversOnline, **activeRides**, ridesByStatus |

## ترابط الطبقات (التطبيق ← API ← MongoDB)

التطبيق **لا يتصل بقاعدة البيانات مباشرة**. السلسلة ثابتة:

**Expo (Axios في `mobile/src/api/client.js`) → Express (`backend/src`) → Mongoose → MongoDB.**

| خطوة | ماذا تفعل |
|------|-----------|
| 1 | تشغيل **MongoDB** محليًا أو Docker من `backend/`: `docker compose up -d` |
| 2 | نسخ `backend/.env.example` إلى `backend/.env` وتعديل **`MONGODB_URI`** و **`JWT_SECRET`** |
| 3 | تشغيل الـ API: من الجذر **`npm run backend`** أو من `backend/` استخدم `npm run dev` — انتظر في الطرفية: `MongoDB connected` وعناوين **LAN API** |
| 4 | نسخ `mobile/.env.example` إلى `mobile/.env` — غالبًا **`EXPO_PUBLIC_API_URL=http://localhost:3000`** (على الهاتف يُعاد كتابة العنوان إلى IP الشبكة المحلية تلقائيًا في وضع التطوير) |
| 5 | إن كان ويندوز يمنع المنفذ **3000** من الهاتف: إما فتح الجدار الناري (`backend/scripts/allow-api-port-windows.ps1`) أو تشغيل **`npm run api-proxy`** وتفعيل **`EXPO_PUBLIC_USE_API_PROXY=1`** في `mobile/.env` حسب `mobile/.env.example` |

**تحقق:** من المتصفح على الكمبيوتر افتح `http://localhost:3000/health` — يجب أن ترى `"database": true` عندما MongoDB متصل. شاشة تسجيل الدخول تعرض أيضًا حالة الاتصال عبر `ConnectionStatusBanner`.

تشغيل سريع للـ backend والموبايل معًا (بعد `npm install` في الجذر مرة واحدة لتحميل `concurrently`):

```powershell
npm install
npm run dev
```

(ما زال مطلوبًا أن يكون MongoDB يعمل قبل تشغيل الـ backend.)

**هاتف حقيقي على نفس الـ Wi‑Fi:** في `mobile/.env` يمكن تفعيل **`EXPO_PUBLIC_USE_API_PROXY=1`** (القيمة الافتراضية في هذا المستودع مع البروكسي على **8090**) ثم من الجذر:

```powershell
npm run dev:lan
```

يعمل **backend + api-proxy + Expo** معًا؛ افتح جدار الحماية للمنفذ **8090** مرة واحدة:

```powershell
.\backend\scripts\allow-api-port-windows.ps1 -Port 8090
```

---

## Prerequisites

- **Node.js 18+**
- **MongoDB** (local or Atlas). Quick local option: from `backend/`, run `docker compose up -d`.
- **Expo CLI** via `npx expo` (no global install required).
- **Google Maps**: enable Maps SDK for Android / iOS in Google Cloud, create API keys, put them in `mobile/app.json` under `ios.config.googleMapsApiKey` and `android.config.googleMaps.apiKey`. iOS simulator can use Apple Maps if you omit `PROVIDER_GOOGLE` on iOS (the app uses Google provider on Android only).

## Backend setup

```powershell
cd "C:\Users\DELL\Desktop\ReachNative Car\backend"
copy .env.example .env
# Edit .env: MONGODB_URI, JWT_SECRET, PORT (optional)
```

Optional Mongo with Docker:

```powershell
docker compose up -d
```

Start API:

```powershell
npm install
npm run dev
```

On first boot the server **seeds three online mock drivers** (if missing):

- `driver1@demo.local` / `driver123`
- `driver2@demo.local` / `driver123`
- `driver3@demo.local` / `driver123`

Every **~4s** (configurable via `SIMULATION_INTERVAL_MS` in `.env`) the backend **nudges online drivers** toward pickup (accepted) or destination (ongoing), or applies small random drift when idle.

## Mobile setup

The Expo app lives in **`mobile/`** — run `npm` / `npx expo` **from that folder**, or from the repo root use **`npm run mobile`** (after `npm install` inside `mobile` once).

**Do not use `npx run expo`** (wrong: that package is `run`, and it looks for a file `expo` in the repo root). Use one of:
- **From repo root:** `npm run expo` or `npm start` (same as `npm run mobile`)
- **From `mobile/`:** `npx expo start` or `npm start`

```powershell
cd "C:\Users\DELL\Desktop\ReachNative Car\mobile"
copy .env.example .env
```

Set **`EXPO_PUBLIC_API_URL`** in `.env`:

| Where you run the app | Typical API base URL |
|----------------------|-------------------------|
| iOS simulator (same machine) | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical device (same Wi‑Fi) | `http://<your-pc-lan-ip>:3000` |

Start Expo:

```powershell
npm install
npm start
```

(`npm start` runs `expo start --offline` to avoid **EAS login prompts** during local Expo Go dev. For network features use `npm run start:online`.)

If Expo still asks for an account, remove any fake `extra.eas.projectId` from config (this repo no longer includes one).

Open in **Expo Go** or an emulator. Grant **location** permission for the driver flow.

## Example test flow (local)

1. **Start Mongo + backend** (`docker compose up -d`, then `npm run dev` in `backend/`).
2. **Start mobile** with correct `EXPO_PUBLIC_API_URL` for your target (`10.0.2.2` for Android emulator).
3. **Register a passenger** (email/password). On the map, set pickup and destination; set a **minimum fare** you’re willing to pay (≥ suggested, can raise while waiting). **Find a driver**. A driver **sends their price**; you **accept or reject**. If you accept, the driver **confirms or declines** the trip before it becomes `accepted`.
4. **Register a driver** (second emulator/device or log out). **Go online**, wait for polling (~4s), **Accept** the pending ride.
5. Driver: **Start trip** → **End trip**. Passenger should see status move to `completed` and **History** should list the ride.
6. **Seeded drivers**: log in as `driver1@demo.local` / `driver123` on another client to see **pre-placed markers** moving slowly on the map.
7. **Admin**: register with role **admin** (demo only). Open **Dashboard** (totals + active rides + online drivers), then **View all users** / **View all rides**. Use **Settings** for language/theme.
8. **Maps / fare**: after requesting a ride, the API returns `estimatedFare` and `routePath`. With `GOOGLE_DIRECTIONS_API_KEY` set on the server, `routePath` follows roads; otherwise it is a densified straight mock path.

## Troubleshooting (Expo)

- **`Missing @react-native-community/cli-server-api`** or **`expo-asset` cannot be found**: dependencies were out of sync (e.g. old `expo` with new `react-native`). Fix: use **one Expo SDK** for all `expo-*` packages, run `npx expo install --fix` in `mobile/`, and ensure `expo-asset` (and peers) are installed — see `mobile/package.json` in this repo.
- After changing major versions, a clean install helps: delete `mobile/node_modules` and `mobile/package-lock.json`, then `npm install` and `npx expo install --fix`.

## Notes

- **RTL**: switching to Arabic calls `I18nManager.forceRTL`; if layout looks wrong until restart, reload the app once (Expo shake → Reload).
- **Security**: open admin registration is for **local demos only**; lock this down before any real deployment.
- **Validation / errors**: APIs use `express-validator` where noted; unknown routes → `404`; thrown `AppError` / validation → JSON `{ message, errors? }`.
