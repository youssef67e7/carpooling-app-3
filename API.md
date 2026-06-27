# API Reference

Base URL: `http://<host>:3000` (all routes also available under `/api/` prefix)

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new passenger |
| POST | `/auth/login` | Login with email + password |
| POST | `/auth/google` | Google Sign-In |
| POST | `/auth/forgot-password` | Request password reset OTP |
| POST | `/auth/reset-password` | Reset password with OTP |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke all refresh tokens |
| POST | `/auth/email/send-otp` | Send email OTP |
| POST | `/auth/email/verify-otp` | Verify email OTP |
| GET | `/auth/me` | Get current user profile |
| PATCH | `/auth/profile` | Update profile |
| POST | `/auth/register-token` | Register FCM push token |

## Rides

| Method | Path | Description |
|--------|------|-------------|
| POST | `/rides` | Create ride request |
| GET | `/rides/requested` | Get pending ride requests (driver) |
| POST | `/rides/:id/accept` | Accept ride (driver) |
| POST | `/rides/:id/arriving` | Mark driver arriving |
| POST | `/rides/:id/onboard` | Mark passenger onboarded |
| POST | `/rides/:id/cancel` | Cancel ride (passenger) |
| POST | `/rides/:id/driver-cancel` | Cancel ride (driver) |
| POST | `/rides/:id/admin-cancel` | Cancel ride (admin) |
| POST | `/rides/start` | Start ride |
| POST | `/rides/end` | End ride |
| GET | `/rides/nearby-drivers` | Find nearby drivers |
| GET | `/rides/route-preview` | Preview route with fare |
| GET | `/rides/available` | Available rides (driver) |
| GET | `/rides/my-active` | My active rides (driver) |
| GET | `/rides/:id/status` | Ride status |
| GET | `/rides/ratings/given` | My given ratings |
| GET | `/rides/ratings/received` | My received ratings |

## Driver

| Method | Path | Description |
|--------|------|-------------|
| GET | `/driver/status` | Driver status |
| GET | `/driver/dashboard` | Dashboard stats |
| GET | `/driver/earnings-summary` | Earnings summary |
| POST | `/driver/toggle-status` | Go online/offline |
| PATCH | `/driver/location` | Update location |
| POST | `/driver/toggle-availability` | Toggle ride acceptance |
| GET | `/driver/bonuses` | Bonus history |
| GET | `/driver/heatmap` | Demand heatmap data |
| GET | `/driver/break-mode` | Get break settings |
| POST | `/driver/break-mode` | Update break settings |

## Passenger

| Method | Path | Description |
|--------|------|-------------|
| GET | `/passenger/stats` | Passenger statistics |
| GET | `/passenger/history` | Ride history |
| GET | `/passenger/ratings` | Rating history |
| POST | `/passenger/rate-driver` | Rate a driver |

## Wallet

| Method | Path | Description |
|--------|------|-------------|
| GET | `/wallet/accounts` | List wallet accounts |
| POST | `/wallet/accounts` | Create wallet account |
| PUT | `/wallet/accounts/:id/default` | Set default wallet |
| DELETE | `/wallet/accounts/:id` | Delete wallet |
| POST | `/wallet/deposit` | Deposit funds |
| POST | `/wallet/withdraw` | Withdraw funds |
| POST | `/wallet/transfer` | Transfer between wallets |
| GET | `/wallet/transactions` | Transaction history |

## Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List users |
| GET | `/admin/rides` | List rides |
| GET | `/admin/disputes` | List disputes |
| GET | `/admin/stats` | Platform statistics |
| PATCH | `/admin/users/:userId` | Update user |
| DELETE | `/admin/users/:userId` | Delete user |

See route files in `backend/src/routes/` for complete endpoint documentation.