# Carpooling App — Project Summary

## Overview
Full-stack ride-hailing application. Passengers request rides, drivers accept and complete trips. No real-time sockets — polling + FCM push notifications.

## Tech Stack
- **Backend**: Node.js, Express, custom ODM over MongoDB native driver
- **Frontend**: Flutter (mobile) + Riverpod state management
- **Admin Panel**: Vanilla HTML/JS web app
- **Database**: MongoDB Atlas
- **Maps**: OpenStreetMap via `flutter_map`
- **Push**: Firebase Cloud Messaging v1
- **Email**: Nodemailer + Gmail SMTP
- **Auth**: JWT (15min) + refresh tokens (7d), Google Sign-In, Email OTP, Phone OTP
- **Deployment**: Vercel (serverless)

## Feature Completion: 87% (61/70)

| Phase | Complete | Total |
|---|---|---|
| Phase 6 — Auth | 6 | 6 |
| Phase 7 — Notifications | 12 | 14 |
| Phase 8 — Ride Experience | 9 | 10 |
| Phase 9 — Maps | 7 | 7 |
| Phase 10 — Wallet | 9 | 9 |
| Phase 11 — Driver Features | 8 | 8 |
| Phase 12 — Admin | 7 | 9 |
| Phase 13 — Production | 3 | 7 |

## Missing Items
1. Driver rates passenger (endpoint + UI)
2. Admin broadcast notifications (POST /admin/broadcast)
3. Refund processed FCM notification
4. Report resolved FCM notification
5. CSV export endpoints
6. Crash reporting, analytics, monitoring

## Key URLs
- **Production**: https://carpooling-app-3-virid.vercel.app
- **Admin UI**: https://carpooling-app-3-virid.vercel.app/admin-ui/
- **Health**: https://carpooling-app-3-virid.vercel.app/api/health
- **GitHub**: https://github.com/youssef67e7/carpooling-app-3.git

## Project Structure
```
backend/           # Node.js API server
apps/mobile-flutter/  # Flutter mobile app
doc_report/        # Documentation files
final/             # Final documentation bundle
```
