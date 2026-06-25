# FCM Push Notification Implementation Report

## Files Changed

| File | Change |
|---|---|
| `backend/src/services/googleAuth.js` | Added `firebase-service-account.json` fallback when env vars not set |
| `backend/.env` | Added `FCM_PROJECT_ID=yousef-22413` |
| `apps/mobile-flutter/lib/core/router/app_router.dart` | Exported `rootNavigatorKey` (was private `_rootKey`) |
| `apps/mobile-flutter/lib/core/services/fcm_service.dart` | Real foreground banner, background data store, tap navigation |
| `apps/mobile-flutter/lib/core/sync/api_sync_bridge.dart` | Removed duplicate `FcmService.initialize()` call |

---

## Notification Flow

```
Ride Event (backend)
  ↓
notificationHelpers.notify{Event}(ride)
  ↓
fcmService.sendPush(userId, {title, body}, {type, rideId, status, ...})
  ↓
googleAuth.getAccessToken() → OAuth2 JWT from service-account.json
  ↓
FCM HTTP v1 API → POST /v1/projects/yousef-22413/messages:send
  ↓
Firebase delivers to device (Android / iOS)
  ↓
┌─ Foreground ───────────────────┬─ Background ───────────────────┐
│                                 │                                │
│ onMessage.listen               │ onBackgroundMessage handler    │
│   → Show in-app banner          │   → Store data in              │
│     (5s auto-dismiss,          │     pendingNotificationPayload  │
│      tap navigates to chat)    │                                │
│                                 │ onMessageOpenedApp.listen      │
│                                 │   → Navigate to /ride-chat:id  │
│                                 │                                │
│                                 │ getInitialMessage (cold start) │
│                                 │   → Store payload + navigate   │
└─────────────────────────────────┴────────────────────────────────┘
```

### Token Lifecycle

```
App start
  ↓
Firebase.initializeApp()
  ↓
FcmService.initialize()
  → requestPermission(alert, badge, sound)
  → onMessage listener (foreground banner)
  → onMessageOpenedApp listener (tap navigation)
  → getInitialMessage (cold start check)
  ↓
User logs in → apiSyncBridge.connect()
  → listenTokenRefresh (re-register on change)
  → registerToken() → POST /auth/register-token
    → Backend upserts into fcmTokens collection
    → Backend auto-cleans invalid tokens on send failure
```

---

## Payload Examples

### Ride Accepted (to passenger)
```json
{
  "message": {
    "notification": {
      "title": "Driver found!",
      "body": "Your ride has been accepted"
    },
    "data": {
      "type": "ride_update",
      "rideId": "<uuid>",
      "status": "accepted",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    },
    "token": "<fcm-token>"
  }
}
```

### Driver Arriving (to passenger)
```json
{
  "message": {
    "notification": {
      "title": "Driver has arrived",
      "body": "Your driver is waiting at the pickup point"
    },
    "data": {
      "type": "ride_update",
      "rideId": "<uuid>",
      "status": "arrived",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    },
    "token": "<fcm-token>"
  }
}
```

### Passenger Onboard (to passenger)
```json
{
  "message": {
    "notification": {
      "title": "You're on board",
      "body": "Your driver is now starting the trip"
    },
    "data": {
      "type": "ride_update",
      "rideId": "<uuid>",
      "status": "onboard",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    },
    "token": "<fcm-token>"
  }
}
```

### Trip Started (to passenger)
```json
{
  "message": {
    "notification": {
      "title": "Trip started",
      "body": "You are on your way"
    },
    "data": {
      "type": "ride_update",
      "rideId": "<uuid>",
      "status": "in_progress",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    },
    "token": "<fcm-token>"
  }
}
```

### Trip Completed (to passenger + driver)
```json
{
  "message": {
    "notification": {
      "title": "Trip completed",
      "body": "Please rate your experience"
    },
    "data": {
      "type": "ride_update",
      "rideId": "<uuid>",
      "status": "completed",
      "fare": "<amount>",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    },
    "token": "<fcm-token>"
  }
}
```

---

## Test Results

| Test | Result |
|---|---|
| `googleAuth.getAccessToken()` — reads from `firebase-service-account.json` | **PASS** |
| `googleAuth.getProjectId()` — returns `yousef-22413` | **PASS** |
| `fcmService` exports all 3 push functions | **PASS** |
| `POST /auth/register-token` — upserts into `fcmTokens` | **PASS** (pre-existing) |
| `notificationHelpers` — all 5 ride events have notify helpers | **PASS** (pre-existing) |
| `rides.js` — all 5 ride events call notify helpers | **PASS** (pre-existing) |
| `FcmService.initialize()` — onMessage listener registered | **PASS** (pre-existing) |
| `FcmService.initialize()` — onMessageOpenedApp listener registered | **PASS** (pre-existing) |
| `FcmService.initialize()` — getInitialMessage handled | **PASS** (pre-existing) |
| Fcm foreground in-app banner — renders on message received | **PASS** |
| Fcm foreground banner tap — navigates to `/ride-chat/:id` | **PASS** |
| Fcm background notification tap — navigates to `/ride-chat/:id` | **PASS** |
| Fcm cold-start notification tap — navigates after app init | **PASS** |
| Duplicate FCM init eliminated | **PASS** |
| Root navigator key exported for FcmService navigation | **PASS** |

---

## Known Limitations

1. **No notification channels for Android 8+** — All notifications use the default FCM channel. Could add custom channels (e.g., "ride_updates", "chat") for user-configurable importance.
2. **No `flutter_local_notifications`** — Foreground notifications use a custom in-app banner overlay rather than the system notification tray. This avoids adding a dependency and follows the pattern of showing in-app UI when the app is open.
3. **No delivery receipts** — FCM doesn't guarantee delivery. The `fcmService.js` only detects and cleans up invalid tokens (unregistered). No retry logic is implemented.
4. **iOS APNS setup** — Firebase Cloud Messaging on iOS requires APNS certificate/key or an APNS auth key. The `GoogleService-Info.plist` is not present in the iOS project — iOS push notifications may not work until this is configured.
5. **No advanced targeting** — All notifications are sent to individual user IDs. No topic-based, segment-based, or A/B test targeting is implemented.
6. **Token deduplication** — If a user logs in on multiple devices, each device registers its own FCM token, and all devices receive notifications. No device-limit or cross-device sync is implemented.
7. **No rate limiting** — FCM HTTP v1 API is free but has a default quota of 600K requests/second/project. No application-level rate limiting is imposed.
