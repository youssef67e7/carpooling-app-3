# WERET — Ride-Hailing Platform

WERET is a full-stack ride-hailing platform with passenger, driver, and admin applications.

## Architecture

```
├── backend/               Node.js + Express + MongoDB API
│   ├── src/
│   │   ├── mongo/         ODM, native query layer, schema/indexes
│   │   ├── routes/        Route handlers (auth, rides, wallet, etc.)
│   │   ├── models/        Data model definitions
│   │   ├── middleware/     Auth, validation, rate limiting, logging
│   │   ├── services/      Business logic (wallet, ratings, FCM, etc.)
│   │   ├── schemas/       Zod validation schemas
│   │   ├── seed/          Demo data seeding
│   │   └── utils/         Helpers (JWT, email OTP, geo, logger)
│   ├── Dockerfile         Multi-stage production build
│   └── docker-compose.yml Full-stack deployment
├── apps/
│   └── mobile-flutter/    Flutter mobile app (Android + iOS)
├── scripts/               Build and utility scripts
└── .github/workflows/     CI/CD pipelines
```

## Quick Start

### Prerequisites

- Node.js 22+
- Flutter 3.29+
- MongoDB Atlas account (or local MongoDB / Docker)

### Backend

```bash
cd backend
cp .env.production .env
# Edit .env with your credentials
npm install
npm run dev
```

### Flutter

```bash
cd apps/mobile-flutter
flutter pub get
flutter run --dart-define=API_URL=http://<backend-ip>:3000
```

### Docker (full stack)

```bash
docker compose up --build
```

## Key Features

- Passenger ride booking, driver matching, real-time tracking
- Driver earnings, bonuses, heatmap, break mode
- Wallet system (deposits, withdrawals, transfers)
- In-app chat and notifications (FCM)
- Safety module (trusted contacts, panic button, ride sharing)
- Dispute resolution with admin mediation
- Carpool and scheduled rides
- Promotions, referrals, saved places, favorite drivers
- Admin dashboard (users, rides, disputes, finances)

## Project Status

**RC1 — Production Ready** with known non-blocking gaps. See [DEPLOYMENT.md](./DEPLOYMENT.md).