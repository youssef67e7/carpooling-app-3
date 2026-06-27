# Deployment Guide

## Vercel (Production)

**URL**: https://carpooling-app-3-virid.vercel.app

### Deploy
```bash
cd backend
npx vercel deploy --prod
```

### Environment Variables (Vercel)

| Variable | Value | Notes |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `JWT_SECRET` | `your-secret` | JWT signing key |
| `JWT_EXPIRY` | `15m` | Access token TTL |
| `REFRESH_TOKEN_SECRET` | `your-secret` | Refresh token signing key |
| `GOOGLE_OAUTH_WEB_CLIENT_ID` | From Firebase | For Google Sign-In |
| `GOOGLE_OAUTH_ANDROID_CLIENT_ID` | From Firebase | For Google Sign-In |
| `GOOGLE_OAUTH_IOS_CLIENT_ID` | From Firebase | For Google Sign-In |
| `FCM_SERVER_KEY` | From Firebase | Push notifications |
| `FCM_SENDER_ID` | From Firebase | Push notifications |
| `FCM_PROJECT_ID` | From Firebase | Push notifications |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | File uploads |
| `CLOUDINARY_API_KEY` | Cloudinary | File uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary | File uploads |
| `SMTP_HOST` | `smtp.gmail.com` | Email sending |
| `SMTP_PORT` | `587` | Email sending |
| `SMTP_USER` | Gmail address | Email sending |
| `SMTP_PASS` | Gmail app password | Email sending |
| `ADMIN_PASSWORD_YOUSSEF` | bcrypt hash | Admin login |
| `ADMIN_PASSWORD_YOUSSEF1` | bcrypt hash | Admin login |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 15 min window |
| `RATE_LIMIT_MAX` | `500` | Global max requests |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | 15 min window |
| `AUTH_RATE_LIMIT_MAX` | `30` | Auth max requests |

### vercel.json
```json
{
  "builds": [{ "src": "src/index.js", "use": "@vercel/node" }],
  "routes": [
    { "src": "/admin-ui/(.*)", "dest": "/public/admin-ui/$1" },
    { "src": "/admin-ui", "dest": "/public/admin-ui/index.html" },
    { "src": "/(.*)", "dest": "/src/index.js" }
  ]
}
```

### .vercelignore
```
node_modules/
apps/
*.md
.DS_Store
.git
```

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

Requires `.env` file in `backend/` with all environment variables.

### Flutter
```bash
cd apps/mobile-flutter
flutter pub get
flutter run
```

Requires `google-services.json` in `android/app/` for Firebase integration.

## Database

**MongoDB Atlas**: Free M0 cluster.
- Auto-backups enabled
- 86 users, 37 rides, 92 wallets currently in DB
- Indexes auto-created on startup via `ensureMongoIndexes()`
- Additional indexes via `npm run init:indexes`
