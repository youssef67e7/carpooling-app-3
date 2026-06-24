# FCM Architecture — Push Notifications

> **Status:** Not implemented (zero FCM code exists)  
> **Budget:** Free tier (Firebase FCM is unlimited at no cost)  
> **Dependencies to add:** `firebase-admin` (backend) + `firebase_messaging` (Flutter)

---

## Current State

```
┌────────────────────────────────────────────────────────────────────┐
│                        Current (Broken)                            │
│                                                                    │
│  No Firebase Admin SDK initialized on backend                       │
│  No firebase_messaging package in Flutter                           │
│  No FCM tokens stored in MongoDB                                    │
│  No pushService.js file exists                                      │
│  No notification event triggers anywhere in ride lifecycle          │
│                                                                    │
│  firebase-service-account.json ── exists on disk, NOT consumed      │
│  google-services.json ── exists for Android, NOT used by app        │
│  pubspec.yaml ── NO firebase_messaging dependency                    │
│  backend/package.json ── NO firebase-admin dependency                │
└────────────────────────────────────────────────────────────────────┘
```

---

## Audit Results

### Firebase Configuration Files

| File | Status | Usage |
|------|--------|-------|
| `backend/firebase-service-account.json` | ✅ Present, valid | Contains project `youssef-f757e`, service account `firebase-adminsdk-fbsvc@youssef-f757e.iam.gserviceaccount.com`, private key, client email. **Not imported by any code.** |
| `apps/mobile-flutter/android/app/google-services.json` | ✅ Present, valid | Contains `project_id: youssef-f757e`, `package_name: com.example.ecommerce_app`, API key. **Not imported by any code.** |
| `firebase.json` | ✅ Present | References `firebase/firestore.rules` and `firebase/firestore.indexes.json` — files don't exist. Firestore is not used. |

### Backend: Existing Firebase-Related Code

| File | Content | Relevance to FCM |
|------|---------|-----------------|
| `src/utils/resolveGoogleSignInToken.js` | `isGoogleOrFirebaseSignInConfigured()` | **Unrelated** — Google OAuth token verification, not FCM |
| `src/routes/auth.js` | References `isGoogleOrFirebaseSignInConfigured` | **Unrelated** — checks if Google Sign-In is configured |
| `src/models/User.js` | Has `firebaseUid` field in `uniqueFields` | **Legacy field** — was intended for Firebase Auth `uid`, never populated |
| `src/index.js` | Socket.io `subscribeRide` events | **Unrelated** — Socket.io, not FCM |

**No FCM-related code exists anywhere in the backend.**

### Flutter: Existing Firebase-Related Code

| File | Content | Relevance to FCM |
|------|---------|-----------------|
| `pubspec.yaml` | **No** `firebase_messaging`, `firebase_core`, or any Firebase package | Not configured |
| `lib/features/more/notification_settings_screen.dart` | Notification preferences UI | Exists as a screen shell, no FCM integration |
| `lib/l10n/en.json`, `ar.json` | `weretGoogleFirebaseLinkFailed` translation | Google Sign-In error message, not FCM |

**No Firebase packages exist in Flutter dependencies.**

### Device Token Storage

| Storage Location | Current State | Required |
|-----------------|--------------|----------|
| MongoDB `users` collection | No `fcmToken` field defined in model | Must add `fcmToken` + `fcmTokens[]` array |
| SharedPreferences (Flutter) | No FCM token stored | Token handled by `firebase_messaging` SDK internally |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FLOW DIAGRAM                                    │
│                                                                         │
│  ┌──────────┐    ┌──────────────────────┐    ┌──────────────────────┐   │
│  │  Ride     │    │  Backend Express     │    │  Firebase FCM        │   │
│  │  Event    │───►│  (notifyUser())      │───►│  (topic/token send)  │   │
│  │  (create, │    │                      │    │                      │   │
│  │  accept,  │    │  MongoDB lookup:     │    │  Message payload:    │   │
│  │  complete)│    │  user.fcmTokens[]    │    │  - title             │   │
│  └──────────┘    │  OR topic send        │    │  - body              │   │
│                  └──────────────────────┘    │  - data.rideId        │   │
│                                              │  - data.type          │   │
│                                              └──────────┬───────────┘   │
│                                                         │               │
│                                                         ▼               │
│                                              ┌──────────────────────┐   │
│                                              │  Flutter App         │   │
│                                              │                      │   │
│                                              │  Foreground:         │   │
│                                              │  onMessage → UI alert│   │
│                                              │                      │   │
│                                              │  Background:         │   │
│                                              │  onBackgroundMessage │   │
│                                              │  → local notif       │   │
│                                              │                      │   │
│                                              │  Tapped:             │   │
│                                              │  onMessageOpenedApp  │   │
│                                              │  → navigate to ride  │   │
│                                              └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Topic Strategy (No Individual Tokens)

Using **FCM topics** instead of individual device tokens avoids needing to store and manage per-device tokens. Each user subscribes to their personal topic on the client.

| Topic Pattern | Subscriber | Purpose |
|---------------|-----------|---------|
| `user_{userId}` | Specific passenger | Ride accepted, arrived, completed, chat message |
| `driver_{userId}` | Specific driver | New ride request, ride cancelled |
| `admin_alerts` | All admin devices | Emergency alerts, system notifications |

**Why topics over tokens:**
- No need to store device tokens in MongoDB (simpler schema)
- No stale token cleanup logic needed
- Multiple devices per user Just Work(tm) (same topic, all devices receive)
- FCM topic subscriptions are managed client-side

### Token-Based Fallback

For users who need notification delivery guarantee (not optional), store tokens as a fallback:

```javascript
// users collection schema addition:
{
  fcmTokens: ["token1", "token2"],  // optional, for direct send
  fcmTopic: "user_abc123"           // primary delivery channel
}
```

The topic approach is preferred for this project's scale (graduation project, <100 concurrent users).

---

## Notification Events & Data Flow

### Event 1: New Ride Request

```
Trigger: POST /api/rides (passenger creates ride)
         │
         ▼
         Backend finds available drivers for the ride
         │
         ▼
         For each matching driver:
           notifyUser({
             userId: driver._id,
             role: "driver",
             type: "ride_requested",
             title: "New ride request",
             body: "From {pickup} to {destination}",
             data: { rideId, pickupLat, pickupLng }
           })
         │
         ▼
         sendToTopic("driver_{driverId}", { ... })
         │
         ▼
         Driver receives push → app opens ride request screen
```

**Data payload:**
```json
{
  "type": "ride_requested",
  "rideId": "abc123",
  "pickupLat": 30.0444,
  "pickupLng": 31.2357,
  "pickupName": "Tahrir Square"
}
```

### Event 2: Ride Accepted

```
Trigger: POST /api/rides/:id/accept (driver accepts)
         │
         ▼
         notifyUser({
           userId: passenger._id,
           role: "passenger",
           type: "ride_accepted",
           title: "Driver on the way",
           body: "{driverName} accepted your ride",
           data: { rideId, driverId, etaMinutes }
         })
         │
         ▼
         sendToTopic("user_{passengerId}", { ... })
```

### Event 3: Ride Arrived

```
Trigger: POST /api/rides/:id/arrived (driver marks arrived)
         │
         ▼
         notifyUser({
           userId: passenger._id,
           role: "passenger",
           type: "ride_arrived",
           title: "Driver has arrived",
           body: "Your driver is at the pickup location",
           data: { rideId }
         })
```

### Event 4: Ride Completed

```
Trigger: POST /api/rides/:id/complete (driver ends ride)
         │
         ▼
         notifyUser({
           userId: passenger._id,
           role: "passenger",
           type: "ride_completed",
           title: "Ride completed",
           body: "Trip from {pickup} to {destination} completed",
           data: { rideId, fare, durationMinutes }
         })
         │
         ▼
         notifyUser({
           userId: driver._id,
           role: "driver",
           type: "ride_completed",
           title: "Ride completed",
           body: "Payment of {fare} EGP added to wallet",
           data: { rideId, fare }
         })
```

### Event 5: New Chat Message

```
Trigger: POST /api/chat/:rideId/send (user sends message)
         │
         ▼
         Only send push if recipient is NOT currently viewing the chat
         (detect via: last active timestamp OR polling activity)
         │
         ▼
         notifyUser({
           userId: recipient._id,
           role: recipient.role,
           type: "chat_message",
           title: "New message",
           body: "{senderName}: {messagePreview}",
           data: { rideId, chatMessageId }
         })
```

---

## Backend Implementation Plan

### New Files

| File | Purpose |
|------|---------|
| `backend/src/config/firebase.js` | Initialize Firebase Admin SDK from service account JSON or env vars |

**firebase.js design:**
```javascript
// Initialize once, reuse across requests (module-level singleton)
// Read service account from:
//   1. FIREBASE_SERVICE_ACCOUNT_JSON env var (Vercel) — JSON string
//   2. backend/firebase-service-account.json (local dev) — file path fallback
// Return admin.messaging() instance
```

### New/Modified Files

| File | Change |
|------|--------|
| `backend/src/services/pushService.js` | **New file.** Export `sendToTopic()`, `notifyUser()` functions |
| `backend/src/routes/auth.js` | Add `PUT /auth/fcm-topic` endpoint for clients to register their topic subscription |
| `backend/src/routes/rides.js` | Add `notifyUser()` calls after ride create, accept, arrive, complete |
| `backend/src/routes/chat.js` | Add `notifyUser()` call after message send (when recipient is not actively viewing) |
| `backend/.env` | Add `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` |
| `backend/package.json` | Add `firebase-admin` dependency |

### Core Function Signatures

```javascript
// config/firebase.js
function getMessaging()           // returns admin.messaging() singleton

// services/pushService.js
async function sendToTopic(topic, title, body, data = {})
async function sendToUser(userId, title, body, data = {})   // topic-based
async function notifyUser(userId, role, type, title, body, data = {})
```

### Endpoint: Register FCM Topic

```
PUT /api/auth/fcm-topic
Authorization: Bearer <jwt>

Request:  { role: "passenger"|"driver" }
Response: { success: true, topic: "user_abc123" }
```

The client subscribes to the topic on the FCM SDK directly (client-side API call to Firebase). This endpoint tells the client what topic name to subscribe to. The topic name convention is deterministic (`user_{userId}` or `driver_{userId}`) so this endpoint is informational — clients can derive the topic name without it.

---

## Flutter Implementation Plan

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `firebase_core` | ^3.x | Required by firebase_messaging |
| `firebase_messaging` | ^15.x | FCM client SDK |

### New/Modified Files

| File | Change |
|------|--------|
| `lib/core/services/fcm_service.dart` | **New file.** Initialize Firebase, get token, subscribe to topic, handle foreground/background messages |
| `lib/main.dart` | Call `FcmService.init()` on app startup, register background message handler |
| `lib/core/router/app_router.dart` | Handle notification tap navigation (deep link to ride screen) |
| `pubspec.yaml` | Add `firebase_core` + `firebase_messaging` |

### Flutter FCM Service Design

```dart
class FcmService {
  // Initialize Firebase + FCM
  static Future<void> init() async {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,  // from google-services.json / GoogleService-Info.plist
    );
    final messaging = FirebaseMessaging.instance;

    // Request permission (iOS)
    await messaging.requestPermission();

    // Subscribe to user topic after login
    // Topic name: "user_{userId}" or "driver_{userId}"
  }

  // Subscribe to personal topic
  static Future<void> subscribeToTopic(String topic) async {
    await FirebaseMessaging.instance.subscribeToTopic(topic);
  }

  // Unsubscribe on logout
  static Future<void> unsubscribeFromTopic(String topic) async {
    await FirebaseMessaging.instance.unsubscribeFromTopic(topic);
  }

  // Foreground message handler
  static void handleForegroundMessages(void Function(RemoteMessage) onMessage) {
    FirebaseMessaging.onMessage.listen(onMessage);
  }

  // Background tap handler
  static void handleNotificationTap(void Function(RemoteMessage) onTap) {
    FirebaseMessaging.onMessageOpenedApp.listen(onTap);
    // Also check if app was opened from a terminated state
    FirebaseMessaging.instance.getInitialMessage().then(onTap);
  }
}
```

### Message Handling

| App State | Handler | Action |
|-----------|---------|--------|
| Foreground | `FirebaseMessaging.onMessage` | Show in-app notification banner or dialog (not system notification — user is already in app) |
| Background | `onBackgroundMessage` (top-level function) | System shows notification automatically from payload |
| Terminated → Tapped | `getInitialMessage()` + `onMessageOpenedApp` | Navigate to ride detail screen using `rideId` from data payload |

### Navigation on Tap

```dart
// In app router or main.dart
void _handleNotificationTap(RemoteMessage message) {
  final rideId = message.data['rideId'];
  final type = message.data['type'];
  if (rideId == null) return;

  switch (type) {
    case 'ride_requested':
      // Navigate driver to ride request screen
      navigatorKey.currentState?.pushNamed('/driver/request/$rideId');
      break;
    case 'ride_accepted':
    case 'ride_arrived':
    case 'ride_completed':
      // Navigate passenger to ride detail screen
      navigatorKey.currentState?.pushNamed('/ride/$rideId');
      break;
    case 'chat_message':
      // Navigate to chat screen
      navigatorKey.currentState?.pushNamed('/ride-chat/$rideId');
      break;
  }
}
```

---

## Data Schema Changes

### MongoDB — No Schema Change Needed (Topic-Based)

Since we use **topic-based FCM** (not device tokens), no new fields are needed in MongoDB. The topic name is deterministic:

```
user_{userId}     → passengers subscribe
driver_{userId}   → drivers subscribe
```

### If Token Storage Is Added (Future)

```javascript
// users collection — optional addition:
{
  fcmTokens: ["token1", "token2"]  // array supports multiple devices
}
```

---

## Environment Variables

### Backend `.env` Additions

| Variable | Value | Source |
|----------|-------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | (JSON string) | Contents of `firebase-service-account.json` — for Vercel deployment |
| `FIREBASE_PROJECT_ID` | `youssef-f757e` | From service account |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@...` | From service account |
| `FIREBASE_PRIVATE_KEY` | (escaped private key) | From service account |

For local dev, the service account can be read directly from `firebase-service-account.json` file.

### Flutter `.env` Additions

| Variable | Value | Purpose |
|----------|-------|---------|
| (none) | — | Firebase config is in `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) |

---

## Vercel Compatibility

| Concern | Mitigation |
|---------|------------|
| Firebase Admin SDK on serverless | Singleton initialization with lazy loading — reuse across warm instances. Cold start penalty ~200ms for first FCM send. |
| FCM API quota | FCM is free and unlimited. No concerns. |
| Topic subscription persistence | Topics are managed on Firebase servers, not tied to Vercel instances. Survives cold starts. |
| Notification delivery guarantee | FCM uses Google's infrastructure for delivery. If Vercel function times out before FCM responds, notification may be lost. Mitigation: fire-and-forget (non-blocking, log on failure). |

---

## Migration Steps

| Step | File/Task | Risk |
|------|-----------|------|
| 1 | `npm install firebase-admin` in `backend/` | 🟢 Low |
| 2 | Create `backend/src/config/firebase.js` — singleton initialization from service account file + env var fallback | 🟢 Low |
| 3 | Create `backend/src/services/pushService.js` — `sendToTopic()`, `sendToUser()`, `notifyUser()` | 🟡 Medium |
| 4 | Add `notifyUser()` calls to `routes/rides.js` after ride create, accept, arrive, complete | 🟡 Medium |
| 5 | Add `notifyUser()` call to `routes/chat.js` after message send | 🟡 Medium |
| 6 | Add `PUT /auth/fcm-topic` endpoint (informational — tells client its topic name) | 🟢 Low |
| 7 | Add `firebase_core` + `firebase_messaging` to Flutter `pubspec.yaml` | 🟢 Low |
| 8 | Create `lib/core/services/fcm_service.dart` — init, subscribe, handle messages | 🟡 Medium |
| 9 | Update `lib/main.dart` — register background handler, wire navigation on tap | 🟡 Medium |
| 10 | Test all 5 notification events end-to-end on physical device | 🟡 Medium |

---

## Rollback

| Layer | Rollback Action |
|-------|----------------|
| Backend pushService | Remove notifyUser() calls from route handlers — app continues without push |
| Backend firebase.js | Delete file, remove firebase-admin dependency |
| Flutter fcm_service | Remove firebase_messaging dependency, remove init call |
| Topic subscriptions | Unsubscribe via Firebase console or client-side call |

Push notification failure is **non-blocking** — the app functions correctly without FCM. Users receive updates via REST polling regardless of push delivery. This makes FCM a purely additive feature with zero risk of regression.
