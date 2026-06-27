# Changelog

## v1.0.0 — Production Polish Release

### Authentication
- Email OTP login system — replaces phone SMS as primary auth method
- Google Sign-In fully configured and verified working
- Password reset via email (3-step: email → OTP → new password)
- Refresh token rotation with anti-reuse detection
- **New**: Self-delete account endpoint + settings UI
- `POST /auth/delete-account` with full cascade delete
- Password confirmation for email users, simple confirm for Google/phone

### Security
- Block/suspend enforcement on `GET /auth/me` — blocked users cannot restore session
- Flutter auth interceptor handles 403 ACCOUNT_BLOCKED/SUSPENDED
- Rate limiting: 500/15m global, 30/15m on auth routes
- JWT 15min expiry with 7-day refresh tokens

### Ride Experience
- Complete ride lifecycle: requesting → accepting → arriving → onboard → start → end
- Passenger rating of driver on trip completion
- In-app chat with 10s polling
- All transitions send FCM push notifications

### Wallet
- Top up, withdraw (2-step with OTP), transaction history
- Ride refund display fixed — now shown as credit (green +)
- Wallet accounts: cash, instapay, vodafone, card
- Works for both passenger and driver roles

### Driver Features
- Vehicle management (list, add, set active)
- Online/offline toggle
- Location tracking updates
- Earnings dashboard
- Application flow: submit → pending → approved/rejected
- Rejected state UI with admin review note

### Admin
- Dashboard with KPIs, charts, activity feed
- User/ride/report/transaction/audit search with pagination
- User moderation: block, verify, approve driver, delete
- Driver approval auto-switches role to "driver"
- Transaction flagging for suspicious activity

### Notifications (FCM)
- 12/14 events send push notifications
- Flutter handles foreground (banner), background (navigate), and terminated state
- Missing: refund processed, report resolved notifications

### Maps
- OpenStreetMap via flutter_map
- Pickup/destination markers, route polyline, nearby drivers
- 15-30s polling while ride active

### Infrastructure
- Custom ODM over MongoDB native driver — ObjectId auto-conversion
- MongoDB Atlas with 30+ auto-created indexes
- Health check endpoint at `/api/health`
- Vercel production deployment with .vercelignore
- Admin web panel at `/admin-ui/`

### Bug Fixes
- ODM ObjectId/string `_id` mismatch — root cause of 401 USER_NOT_FOUND
- Flutter login screen Form wrappers — `_formKey.currentState` was null
- Driver onboarding validation feedback — added snackbar
- Admin Google sign-in token key mismatch (`data.token || data.accessToken`)
