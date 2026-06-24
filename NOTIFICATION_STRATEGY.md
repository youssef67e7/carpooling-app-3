# Phase 11 — Notification Strategy

## Current State (Broken)

```javascript
// services/pushService.js — CURRENT (BROKEN)
const admin = require('firebase-admin');

// This will fail because Firebase is not properly initialized
// The service account credentials in .env may be incomplete or malformed
async function sendToUser(userId, title, body) {
  const user = await User.findById(userId);
  if (user.fcmToken) {
    await admin.messaging().sendToDevice(user.fcmToken, {
      notification: { title, body }
    });
  }
}
```

**Problems:**
1. Firebase Admin SDK not properly initialized
2. Service account key may be malformed in `.env` (newlines in private key)
3. `sendToDevice()` is deprecated in newer Firebase Admin SDK
4. FCM tokens may be stale with no cleanup mechanism
5. Only mobile push — no fallback (SMS, email, in-app)

## Target: Multi-Channel Push with FCM

### Firebase Initialization (Fixed)

Create a dedicated config file for Firebase:

```javascript
// config/firebase.js
const admin = require('firebase-admin');

let firebaseApp = null;

function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  
  // Handle private key with escaped newlines from env var
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n');
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
  
  return firebaseApp;
}

module.exports = { getFirebaseApp };
```

### Push Service (Rewritten)

```javascript
// services/pushService.js — TARGET
const { getFirebaseApp } = require('../config/firebase');

async function sendToUser(userId, title, body, data = {}) {
  // Get user's FCM token from DB
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { fcmToken: 1 } }
  );
  
  if (!user || !user.fcmToken) return false;
  
  const firebaseApp = getFirebaseApp();
  
  try {
    const message = {
      token: user.fcmToken,
      notification: { title, body },
      data,  // custom payload as string-keyed object
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };
    
    await firebaseApp.messaging().send(message);
    return true;
  } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered') {
      // Token is stale — remove from DB
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $unset: { fcmToken: '' } }
      );
    }
    // Log but don't throw — non-critical service
    console.error('FCM send failed:', error.code, error.message);
    return false;
  }
}

async function sendToTopic(topic, title, body, data = {}) {
  const firebaseApp = getFirebaseApp();
  
  try {
    const message = {
      topic,
      notification: { title, body },
      data,
    };
    
    await firebaseApp.messaging().send(message);
    return true;
  } catch (error) {
    console.error('FCM topic send failed:', error.code, error.message);
    return false;
  }
}
```

### Topic Strategy

| Topic | Subscribers | Usage |
|-------|-------------|-------|
| `driver_{driverId}` | Specific driver | Ride requests, system alerts |
| `user_{userId}` | Specific user | Ride status updates, promotions |
| `admin_alerts` | All admin devices | Emergency alerts, system issues |

### Notification Types & Channels

| Event | Push (FCM) | In-App Notification | SMS (Twilio) | Email (Nodemailer) |
|-------|-----------|-------------------|-------------|-------------------|
| Ride requested | ✅ (driver) | ✅ | ❌ | ❌ |
| Ride accepted | ✅ (user) | ✅ | ❌ | ❌ |
| Ride completed | ✅ | ✅ | ❌ | ✅ (receipt) |
| New message | ✅ (if app closed) | ✅ | ❌ | ❌ |
| OTP | ❌ | ❌ | ✅ (primary) | ❌ |
| Emergency alert | ✅ (admin) | ✅ | ✅ (admin) | ✅ (admin) |
| Promo code | ✅ (topic) | ✅ | ❌ | ✅ |
| Payment receipt | ✅ | ✅ | ❌ | ✅ |
| Driver verification | ✅ (driver) | ✅ | ❌ | ❌ |

### In-App Notification Storage

All notifications are stored in the `notifications` collection:

```javascript
// Store notification in DB (for in-app display)
async function createInAppNotification(userId, title, body, type, data = {}) {
  const notification = {
    userId: new ObjectId(userId),
    title,
    body,
    type,     // 'ride_update' | 'promo' | 'system'
    data,
    isRead: false,
    createdAt: new Date(),
  };
  
  await db.collection('notifications').insertOne(notification);
}

// Unified send: push + in-app
async function notifyUser(userId, title, body, type, data = {}) {
  await Promise.allSettled([
    sendToUser(userId, title, body, data),
    createInAppNotification(userId, title, body, type, data),
  ]);
}
```

### Notification Polling (see REALTIME_STRATEGY.md)

```javascript
// GET /api/notifications?since=2024-01-01T00:00:00Z
async function getNotifications(req, res) {
  const since = req.query.since ? new Date(req.query.since) : new Date(0);
  
  const notifications = await db.collection('notifications').find({
    userId: req.user._id,
    createdAt: { $gt: since }
  }).sort({ createdAt: -1 }).limit(50).toArray();
  
  res.json({ success: true, data: { notifications } });
}
```

### Flutter FCM Integration

```dart
// In Flutter, use firebase_messaging package
final messaging = FirebaseMessaging.instance;

// Request permissions
NotificationSettings settings = await messaging.requestPermission();

// Get FCM token
String? token = await messaging.getToken();

// Send token to API
await http.put(
  Uri.parse('$apiUrl/users/fcm-token'),
  headers: {'Authorization': 'Bearer $token'},
  body: jsonEncode({'fcmToken': token}),
);

// Listen for foreground messages
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  // Show in-app notification
});

// Handle background tap
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  // Navigate to relevant screen
});
```

### Migration Steps

| Step | Detail |
|------|--------|
| 1 | Create `config/firebase.js` with proper initialization |
| 2 | Rewrite `services/pushService.js` with new FCM API |
| 3 | Create unified `notifyUser()` helper |
| 4 | Add FCM token update endpoint (`PUT /api/users/fcm-token`) |
| 5 | Integrate FCM into ride lifecycle (notify on status change) |
| 6 | Implement Flutter FCM token registration |
| 7 | Test all notification types |
| 8 | Set up Firebase project if not already configured |

### Rollback

- Push failure is non-blocking (already the case — app continues to work)
- In-app notifications via REST polling work regardless of FCM state
- SMS fallback for OTP and critical alerts only
