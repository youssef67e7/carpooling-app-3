# Testing Guide

## Backend Tests

### Health Check
```bash
curl https://carpooling-app-3-virid.vercel.app/api/health
```
Expected: `{ ok: true, database: true, mongo: true, mongoMode: "atlas", ... }`

### Auth Flow

**1. Email OTP Login**
```bash
# Send OTP
curl -X POST https://carpooling-app-3-virid.vercel.app/api/auth/email/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Expected: { success: true }

# Verify OTP (check server console for code in dev)
curl -X POST https://carpooling-app-3-virid.vercel.app/api/auth/email/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
# Expected: { data: { user, accessToken, refreshToken } }
```

**2. Google Sign-In**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"<google_id_token>"}'
# Expected: { user, accessToken, refreshToken }
```

**3. Get Current User**
```bash
curl https://carpooling-app-3-virid.vercel.app/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
# Expected: { user: { _id, name, email, role, ... } }
```

**4. Refresh Token**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
# Expected: { accessToken, refreshToken }
```

**5. Delete Account**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/auth/delete-account \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"password":"userpassword"}'
# Expected: { ok: true }
```

### Ride Flow

**1. Create Ride (Passenger)**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/rides/create \
  -H "Authorization: Bearer <passengerToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": 30.0444, "lng": 31.2357, "address": "Cairo"},
    "destination": {"lat": 30.0764, "lng": 31.2833, "address": "Nasr City"},
    "vehicleType": "standard"
  }'
# Expected: ride object with status "pending"
```

**2. Accept Ride (Driver)**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/rides/<rideId>/accept \
  -H "Authorization: Bearer <driverToken>"
# Expected: updated ride with status "accepted"
```

**3. Driver Arriving**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/rides/<rideId>/arriving \
  -H "Authorization: Bearer <driverToken>"
# Expected: status -> "driver_arriving"
```

**4. Passenger Onboard**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/rides/<rideId>/onboard \
  -H "Authorization: Bearer <driverToken>"
# Expected: status -> "passenger_onboard"
```

**5. Start Trip**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/rides/start \
  -H "Authorization: Bearer <driverToken>" \
  -H "Content-Type: application/json" \
  -d '{"rideId":"<rideId>"}'
# Expected: status -> "ongoing"
```

**6. End Trip**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/rides/end \
  -H "Authorization: Bearer <driverToken>" \
  -H "Content-Type: application/json" \
  -d '{"rideId":"<rideId>"}'
# Expected: status -> "completed", fare breakdown, FCM sent
```

**7. Rate Driver**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/rides/rate \
  -H "Authorization: Bearer <passengerToken>" \
  -H "Content-Type: application/json" \
  -d '{"rideId":"<rideId>","rating":5,"review":"Great ride!"}'
# Expected: { success: true }
```

**8. Cancel Ride (Passenger)**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/rides/<rideId>/cancel \
  -H "Authorization: Bearer <passengerToken>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"changed mind"}'
# Expected: status -> "cancelled"
```

### Admin Flow

**1. Login as Admin**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"youssef@gmail.com","password":"<admin_password>"}'
# Expected: { user, token, refreshToken }
```

**2. Get Dashboard Stats**
```bash
curl https://carpooling-app-3-virid.vercel.app/api/admin/stats \
  -H "Authorization: Bearer <adminToken>"
# Expected: { users, rides, driversOnline, ... }
```

**3. Moderate User (Block)**
```bash
curl -X PATCH https://carpooling-app-3-virid.vercel.app/api/admin/users/<userId> \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"is_blocked":true,"block_reason":"Violation of terms"}'
# Expected: { user: { is_blocked: true, ... } }
```

**4. Approve Driver**
```bash
curl -X PATCH https://carpooling-app-3-virid.vercel.app/api/admin/users/<userId> \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"driver_application_status":"approved"}'
# Expected: user.role -> "driver", user.active_role -> "driver"
```

**5. Delete User**
```bash
curl -X DELETE https://carpooling-app-3-virid.vercel.app/api/admin/users/<userId> \
  -H "Authorization: Bearer <adminToken>"
# Expected: { ok: true }
```

### Wallet Flow

**1. Add Account**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/wallet/accounts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"instapay","label":"My Wallet","details":"0100xxxxxxx"}'
# Expected: account object
```

**2. Deposit**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/wallet/deposit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"accountId":"<accountId>"}'
# Expected: transaction object
```

**3. Request Withdrawal**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/wallet/withdraw/request \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":50,"accountId":"<accountId>"}'
# Expected: { requestId, message }
```

**4. Confirm Withdrawal**
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/wallet/withdraw/confirm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"requestId":"<requestId>","otp":"123456"}'
# Expected: transaction object
```

### Upload
```bash
curl -X POST https://carpooling-app-3-virid.vercel.app/api/upload \
  -F "image=@/path/to/image.jpg"
# Expected: { url: "https://res.cloudinary.com/..." }
```

---

## Flutter Tests

### Analyze
```bash
cd apps/mobile-flutter
flutter analyze
```
Expected: 0 errors, 0 warnings. Info-level suggestions are acceptable.

### Run
```bash
flutter run
```

### Test Checklist

**Authentication**
- [ ] App loads → onboarding screen
- [ ] Tap "Get Started" → login screen
- [ ] Enter email → Send Code → OTP received (check console) → enter OTP → logged in
- [ ] Google Sign-In → browser prompt → return to app → logged in
- [ ] Logout → back to login
- [ ] Forgot Password → enter email → OTP → new password → login works

**Passenger Flow**
- [ ] Home screen loads with map
- [ ] Search pickup location
- [ ] Search destination
- [ ] Select vehicle type
- [ ] Request ride → "Searching for driver..."
- [ ] Driver accepts → notification + status update
- [ ] Driver arriving → notification
- [ ] Onboard → trip started → trip ended
- [ ] Rate driver modal appears
- [ ] Ride history shows completed rides

**Driver Flow**
- [ ] Toggle online/offline
- [ ] Available rides list updates
- [ ] Accept ride → status updates
- [ ] Driver arriving → passenger notified
- [ ] Passenger onboard → start trip
- [ ] End trip → payment processed
- [ ] Earnings dashboard shows correct totals
- [ ] Ride history shows completed trips

**Wallet**
- [ ] View balance
- [ ] Add payment account
- [ ] Deposit funds
- [ ] Request withdrawal
- [ ] Transaction history loads

**Settings**
- [ ] Change language (EN ↔ AR)
- [ ] Change theme
- [ ] Update phone number
- [ ] Delete account → confirmation → account removed

**Admin**
- [ ] Admin panel loads at /admin-ui/
- [ ] Dashboard shows stats
- [ ] Search users by name/email
- [ ] Block/unblock user
- [ ] Approve/reject driver application
- [ ] View rides list
- [ ] View reports
- [ ] View transactions
- [ ] View audit log
