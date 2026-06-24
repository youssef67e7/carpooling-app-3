# Phase 8 — API Specification
7D:53:1B:E6:56:92:F2:77:FC:1A:09:72:D7:7A:84:76:E1:68:30:5C:07:B0:C2:99:97:13:37:7C:B1:67:43:6E
## Base URL
```
Production: https://reachnativecar.vercel.app/api
Staging:    https://staging-reachnativecar.vercel.app/api
Local:      http://localhost:3000/api
```

## Authentication
All endpoints except POST `/api/auth/*` require:
```
Authorization: Bearer <JWT>
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## Endpoints

### Auth (`/api/auth`)

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| POST | `/send-otp` | No | 3/min/phone | Send OTP via SMS |
| POST | `/verify-otp` | No | 5/min/IP | Verify OTP, return JWT |
| POST | `/refresh-token` | Yes | 5/min/user | Get new JWT (same 60d expiry) |

**POST /api/auth/send-otp**
```json
{ "phone": "+1234567890" }
→ { "success": true, "data": { "message": "OTP sent" } }
```

**POST /api/auth/verify-otp**
```json
{ "phone": "+1234567890", "code": "123456" }
→ { "success": true, "data": { "token": "eyJ...", "user": { ... }, "isNewUser": true } }
```

### Users (`/api/users`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| GET | `/profile` | user, driver, admin | Get current user profile |
| PUT | `/profile` | user, driver, admin | Update profile |
| PUT | `/fcm-token` | user, driver | Update FCM push token |
| GET | `/` | admin | List all users (paginated) |

### Drivers (`/api/drivers`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| GET | `/profile` | driver | Get driver profile + vehicle |
| PUT | `/profile` | driver | Update driver profile |
| POST | `/location` | driver | Update current location |
| GET | `/location/:driverId` | user | Get driver's current location |
| POST | `/online` | driver | Go online (set isOnline=true) |
| POST | `/offline` | driver | Go offline |
| POST | `/heartbeat` | driver | Keep-alive (every 30s) |
| GET | `/online` | no auth | List online driver IDs (cached) |
| GET | `/earnings` | driver | Get earnings summary |
| GET | `/` | admin | List all drivers (paginated) |

**POST /api/drivers/location**
```json
{ "latitude": 40.7128, "longitude": -74.0060 }
→ { "success": true }
```

**GET /api/drivers/online**
```json
→ { "success": true, "data": { "onlineCount": 42, "driverIds": ["id1", "id2"] } }
```

### Rides (`/api/rides`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| POST | `/` | user | Request a new ride |
| GET | `/active` | user, driver | Get current active ride |
| GET | `/history` | user, driver | Ride history (paginated) |
| GET | `/requested` | driver | Available ride requests |
| GET | `/:id` | user, driver | Get ride details |
| POST | `/:id/accept` | driver | Accept ride request |
| POST | `/:id/start` | driver | Start ride (driver arrived) |
| POST | `/:id/begin-trip` | driver | Begin trip (pickup complete) |
| POST | `/:id/complete` | driver | Complete ride |
| POST | `/:id/cancel` | user, driver | Cancel ride (with reason) |
| GET | `/:id/status` | user, driver | Get ride status (for polling) |

**POST /api/rides**
```json
{
  "pickup": {
    "address": "123 Main St",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "dropoff": {
    "address": "456 Broadway",
    "latitude": 40.7150,
    "longitude": -74.0080
  },
  "paymentMethod": "cash"
}
→ { "success": true, "data": { "rideId": "...", "status": "requesting", "estimatedFare": 15.50 } }
```

**GET /api/rides/:id/status** (polling endpoint)
```json
→ { "success": true, "data": { "status": "accepted", "driver": { "name": "...", "location": { ... }, "eta": 180 } } }
```

### Chat (`/api/chat`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| GET | `/:rideId/messages` | user, driver | Get messages (with `?since=` param) |
| POST | `/:rideId/send` | user, driver | Send a message |

**GET /api/chat/:rideId/messages?since=2024-01-01T00:00:00Z**
```json
→ { "success": true, "data": { "messages": [{ "senderId": "...", "text": "...", "timestamp": "..." }] } }
```

**POST /api/chat/:rideId/send**
```json
{ "text": "I'm at the entrance" }
→ { "success": true, "data": { "message": { "senderId": "...", "text": "...", "timestamp": "..." } } }
```

### Notifications (`/api/notifications`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| GET | `/` | user, driver | Get notifications (with `?since=` param) |
| PUT | `/:id/read` | user, driver | Mark as read |
| PUT | `/read-all` | user, driver | Mark all as read |

### Payments (`/api/payments`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| POST | `/create-intent` | user | Create Stripe payment intent |
| POST | `/confirm` | user | Confirm payment (webhook) |
| GET | `/history` | user, driver | Payment history |

### Subscriptions (`/api/subscriptions`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| POST | `/create` | user | Create subscription |
| GET | `/active` | user | Get active subscription |
| POST | `/cancel` | user | Cancel subscription |
| GET | `/plans` | no auth | List available plans |

### Reviews (`/api/reviews`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| POST | `/` | user, driver | Create review (after ride) |
| GET | `/driver/:driverId` | no auth | Get driver reviews |

### Promo Codes (`/api/promo`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| POST | `/validate` | user | Validate promo code |
| GET | `/` | admin | List all promo codes |

### Upload (`/api/upload`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| POST | `/profile-image` | user, driver | Upload profile image URL (after client uploads to Cloudinary) |

**POST /api/upload/profile-image**
```json
{ "url": "https://res.cloudinary.com/..." }
→ { "success": true, "data": { "url": "https://res.cloudinary.com/..." } }
```

### Admin (`/api/admin`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| GET | `/stats` | admin | Dashboard statistics |
| GET | `/users` | admin | List users with filters |
| GET | `/drivers` | admin | List drivers with filters |
| GET | `/rides` | admin | List rides with filters |
| GET | `/transactions` | admin | List transactions |
| GET | `/audit-log` | admin | View audit log |
| POST | `/block-user/:id` | admin | Block/unblock user |
| POST | `/verify-driver/:id` | admin | Verify driver |
| POST | `/promo-code` | admin | Create promo code |

### Reports (`/api/reports`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| POST | `/` | user, driver | Submit a report |
| GET | `/` | admin | List reports |
| PUT | `/:id/resolve` | admin | Resolve a report |

### Emergency (`/api/emergency`)

| Method | Path | Auth Role | Description |
|--------|------|-----------|-------------|
| POST | `/alert` | user | Trigger emergency alert |
| POST | `/:id/resolve` | user | Resolve emergency alert |

## Rate Limit Headers
All responses include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Changelog Endpoints
When Socket.io is removed, these additional polling endpoints are added:

```
GET /api/rides/:id/changes?since=<timestamp>  → Returns status changes since timestamp
GET /api/chat/:rideId/changes?since=<timestamp> → Returns new messages count
GET /api/notifications/changes?since=<timestamp> → Returns unread notification count
```

These lightweight endpoints return only change indicators, not full data, reducing bandwidth for pollers.
