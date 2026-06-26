# API Reference

**Base URL**: `https://carpooling-app-3-virid.vercel.app/api`

**Auth**: Most endpoints require `Authorization: Bearer <accessToken>` header.
**Refresh**: `POST /auth/refresh` with `{ refreshToken }` in body.
**Errors**: All errors return `{ error: "message" }` with appropriate HTTP status.

---

## Auth

### `GET /health` / `GET /api/health`
Public. Returns DB status + collection counts.

### `GET /auth/google-config`
Public. Returns Google OAuth client IDs + `enabled` boolean.

### `POST /auth/register`
Create account. Body: `{ name, email, password, role, phone? }`. Returns `{ user, accessToken, refreshToken }`.

### `POST /auth/login`
Admin web login. Body: `{ email, password }`. Returns `{ user, token, refreshToken }`.

### `POST /auth/google`
Google sign-in. Body: `{ idToken }`. Returns `{ user, accessToken, refreshToken }`.

### `POST /auth/phone/otp`
Request phone OTP. Body: `{ phone, forRegister? }`. Rate-limited.

### `POST /auth/phone/verify`
Verify phone OTP. Body: `{ phone, otp, name? }`. Returns `{ user, accessToken, refreshToken }`.

### `POST /auth/email/send-otp`
Request email login OTP. Body: `{ email }`. Rate-limited.

### `POST /auth/email/verify-otp`
Verify email OTP. Body: `{ email, code }`. Returns `{ data: { user, accessToken, refreshToken } }`.

### `GET /auth/me`
Auth required. Returns `{ user }`. Incorporates block/suspend check.

### `PATCH /auth/profile`
Auth required. Update profile fields. Body: `{ phone?, vehicleType?, name? }`. Returns `{ user }`.

### `POST /auth/verify-password`
Auth required. Body: `{ password }`. Returns `{ ok }` or 401.

### `POST /auth/delete-account`
Auth required. Self-delete account with full cascade. Body: `{ password? }`. Returns `{ ok }`.

### `POST /auth/forgot-password`
Request password reset OTP. Body: `{ email }`. Rate-limited. Returns `{ ok }`.

### `POST /auth/reset-password`
Reset password with OTP. Body: `{ email, otp, password }`. Returns `{ ok }`.

### `POST /auth/refresh`
Refresh token rotation. Body: `{ refreshToken }`. Returns `{ accessToken, refreshToken }`.

### `POST /auth/logout`
Auth required. Revokes all refresh tokens. Returns `{ success, data: { revokedSessions } }`.

### `POST /auth/register-token`
Auth required. Register FCM push token. Body: `{ token, platform }`. Returns `{ success }`.

### `POST /auth/verify-firebase-phone`
Verify Firebase phone auth token. Body: `{ firebaseIdToken, name? }`. Returns `{ data: { user, accessToken, refreshToken } }`.

---

## Rides

### `POST /rides/create`
Auth required (passenger). Body: `{ pickup, destination, vehicleType, ... }`. Returns ride object.

### `GET /rides/available`
Auth required (driver). Returns available rides.

### `GET /rides/my-active`
Auth required. Returns current active ride for user.

### `GET /rides/:id`
Auth required. Returns ride details.

### `GET /rides/:id/status`
Auth required. Returns ride status only.

### `POST /rides/:id/accept`
Auth required (driver). Accept ride.

### `POST /rides/:id/arriving`
Auth required (driver). Driver arrived at pickup. Sends FCM.

### `POST /rides/:id/onboard`
Auth required (driver). Passenger onboard. Sends FCM.

### `POST /rides/start`
Auth required (driver). Start trip. Sends FCM.

### `POST /rides/end`
Auth required (driver). End trip, process payment. Sends FCM. Returns fare breakdown.

### `POST /rides/:id/cancel`
Auth required (passenger). Cancel ride. Body: `{ reason? }`. Sends FCM.

### `POST /rides/:id/driver-cancel`
Auth required (driver). Driver cancels ride. Body: `{ reason? }`. Sends FCM.

### `POST /rides/rate`
Auth required (passenger). Rate driver. Body: `{ rideId, rating (1-5), review? }`.

### `GET /rides/ratings/received`
Auth required (driver). Returns ratings summary + list.

### `GET /rides/history`
Auth required. Returns completed/cancelled rides (capped 50).

### `GET /rides/nearby-drivers`
Returns nearby available drivers. Query: `{ lat, lng, vehicleType }`.

### `GET /rides/route-preview`
Returns route polyline + ETA. Query: `{ pickupLat, pickupLng, destLat, destLng }`.

### `POST /rides/driver-confirm-booking`
Auth required (driver). Confirm pool booking.

### `POST /rides/:id/messages`
Auth required (ride participant). Send chat message. Body: `{ content }`. Returns message + FCM.

### `GET /rides/:id/messages`
Auth required. Get chat history.

---

## Driver

### `GET /driver/dashboard`
Auth required (driver). Returns active rides, online status, recent earnings.

### `GET /driver/status`
Auth required (driver). Returns online/offline status.

### `POST /driver/toggle-status`
Auth required (driver). Toggle online/offline. Returns updated status.

### `POST /driver/location-update`
Auth required (driver). Body: `{ lat, lng }`. Updates driver location.

### `GET /driver/cars`
Auth required (driver). Returns vehicle list.

### `POST /driver/cars`
Auth required (driver). Add vehicle. Body: `{ brand, model, color, plateNumber }`.

### `PATCH /driver/cars/:id/set-active`
Auth required (driver). Set active vehicle.

### `GET /driver/earnings-summary`
Auth required (driver). Returns total earnings, trips, rating.

---

## Wallet

### `GET /wallet/accounts`
Auth required. Returns wallet funding accounts.

### `POST /wallet/accounts`
Auth required. Add account. Body: `{ type, label, details }`.

### `DELETE /wallet/accounts/:id`
Auth required. Delete account.

### `POST /wallet/deposit`
Auth required. Deposit to wallet. Body: `{ amount, accountId }`. Returns transaction.

### `POST /wallet/withdraw/request`
Auth required. Request withdrawal. Body: `{ amount, accountId }`. Returns OTP sent.

### `POST /wallet/withdraw/confirm`
Auth required. Confirm withdrawal. Body: `{ requestId, otp }`. Returns transaction.

### `GET /wallet/transactions`
Auth required. Paginated transaction history. Query: `{ page?, limit? }`.

---

## Admin

### `GET /admin/stats`
Admin auth. Returns dashboard KPIs + chart data.

### `GET /admin/users`
Admin auth. Paginated user search. Query: `{ search?, role?, page?, limit? }`.

### `PATCH /admin/users/:id`
Admin auth. Moderate user. Body: `{ is_blocked?, is_verified?, driver_application_status?, role?, note? }`.

### `DELETE /admin/users/:userId`
Admin auth. Cascade-delete user. Cannot self-delete.

### `GET /admin/rides`
Admin auth. Paginated ride search. Query: `{ search?, status?, page?, limit? }`.

### `GET /admin/reports`
Admin auth. Paginated report search. Query: `{ search?, status?, page?, limit? }`.

### `PATCH /admin/reports/:id`
Admin auth. Update report status. Body: `{ status, resolution? }`.

### `GET /admin/transactions`
Admin auth. Paginated transaction search. Query: `{ search?, flagged?, page?, limit? }`.

### `PATCH /admin/transactions/:id/flag`
Admin auth. Flag/unflag transaction. Body: `{ flagged }`.

### `GET /admin/audit`
Admin auth. Paginated audit log. Query: `{ search?, action?, page?, limit? }`.

---

## Other

### `POST /api/upload`
No auth. Upload file to Cloudinary. Body: multipart `image`. Returns `{ url }`.

### `POST /switch-role`
Auth required. Switch between passenger/driver role. Body: `{ role }`. Returns `{ user, accessToken, refreshToken }`.

### `POST /driver-application/submit`
Auth required. Submit driver application with documents.

### `GET /driver-application/me`
Auth required. Returns own driver application status.

### `GET /vehicles`
Public. Returns available vehicle types.

### `POST /reports`
Auth required. Submit report. Body: `{ reportedUserId, rideId?, reason, description? }`.

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request / validation error |
| 401 | Unauthenticated / invalid token |
| 403 | Forbidden (blocked, suspended, role mismatch) |
| 404 | Not found |
| 409 | Conflict (already registered) |
| 429 | Rate limited |
| 500 | Internal server error |
