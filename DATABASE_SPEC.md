# Phase 7 — Database Specification

## Connection

```javascript
// config/db.js — MongoDB Native Driver Connection
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = 'reachnativecar';
const POOL_SIZE = 10;

let client = null;
let db = null;

async function connect() {
  if (db) return db;
  client = new MongoClient(MONGO_URI, {
    maxPoolSize: POOL_SIZE,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    maxIdleTimeMS: 60000,
  });
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

async function disconnect() {
  if (client) await client.close();
  client = null;
  db = null;
}

function getDb() {
  if (!db) throw new Error('Database not connected');
  return db;
}

module.exports = { connect, disconnect, getDb };
```

## Collections & Schemas

### 1. `users`
```javascript
{
  _id: ObjectId,
  phone: String,              // indexed, unique
  name: String,
  email: String,              // sparse index
  role: String,               // "user" | "driver" | "admin" — indexed
  avatar: String,             // Cloudinary URL
  fcmToken: String,           // for push notifications
  isBlocked: Boolean,         // default false
  createdAt: Date,
  updatedAt: Date
}
// Indexes:
//   { phone: 1 } — unique
//   { email: 1 } — sparse
//   { role: 1 }
```

### 2. `drivers`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref → users._id, unique, indexed
  vehicle: {
    make: String,
    model: String,
    year: Number,
    color: String,
    plateNumber: String,
  },
  licenseNumber: String,
  isOnline: Boolean,          // default false, indexed
  isAvailable: Boolean,       // default false
  currentLocation: {
    type: "Point",
    coordinates: [Number, Number]  // [lng, lat]
  },
  lastLocationUpdate: Date,
  totalRides: Number,         // default 0
  rating: Number,             // default 5.0
  totalEarnings: Number,      // default 0
  isVerified: Boolean,        // default false
  createdAt: Date,
  updatedAt: Date
}
// Indexes:
//   { userId: 1 } — unique
//   { isOnline: 1, isAvailable: 1, currentLocation: "2dsphere" }
//      → compound for finding available nearby drivers
//   { "vehicle.plateNumber": 1 } — unique
```

### 3. `riders` (separate from users — ride-specific profile)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref → users._id, unique, indexed
  savedLocations: [
    { name: String, address: String, coordinates: [Number, Number] }
  ],
  rideCount: Number,          // default 0
  rating: Number,             // default 5.0
  createdAt: Date,
  updatedAt: Date
}
// Indexes:
//   { userId: 1 } — unique
```

### 4. `rides`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref → users._id, indexed
  driverId: ObjectId,         // ref → drivers._id (nullable), indexed
  status: String,             // "requesting" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled"
  pickup: {
    address: String,
    coordinates: { type: "Point", coordinates: [Number, Number] }
  },
  dropoff: {
    address: String,
    coordinates: { type: "Point", coordinates: [Number, Number] }
  },
  distance: Number,           // meters
  duration: Number,           // seconds
  fare: Number,
  paymentMethod: String,      // "cash" | "card" | "wallet"
  paymentStatus: String,      // "pending" | "paid" | "refunded"
  rating: Number,             // user rating (1-5)
  driverRating: Number,       // driver rating (1-5)
  cancellationReason: String,
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
// Indexes:
//   { userId: 1, status: 1 }
//   { driverId: 1, status: 1 }
//   { status: 1, createdAt: -1 }
//   { "pickup.coordinates": "2dsphere" }
//   { createdAt: -1 }
```

### 5. `otp`
```javascript
{
  _id: ObjectId,
  phone: String,              // indexed
  code: String,
  expiresAt: Date,            // TTL index — auto-delete after 5 min
  attempts: Number,           // default 0, max 3
  createdAt: Date
}
// Indexes:
//   { phone: 1, code: 1 }
//   { expiresAt: 1 } — TTL (expireAfterSeconds: 0)
```

### 6. `transactions`
```javascript
{
  _id: ObjectId,
  rideId: ObjectId,           // ref → rides._id, indexed
  userId: ObjectId,           // ref → users._id, indexed
  driverId: ObjectId,         // ref → drivers._id, indexed
  amount: Number,
  type: String,               // "payment" | "refund" | "payout"
  status: String,             // "pending" | "completed" | "failed"
  stripePaymentIntentId: String,  // if card payment
  createdAt: Date
}
// Indexes:
//   { rideId: 1 }
//   { userId: 1, createdAt: -1 }
//   { driverId: 1, createdAt: -1 }
```

### 7. `subscriptions`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref → users._id, indexed
  plan: String,               // "weekly" | "monthly" | "yearly"
  startDate: Date,
  endDate: Date,
  status: String,             // "active" | "expired" | "cancelled"
  amount: Number,
  autoRenew: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Indexes:
//   { userId: 1, status: 1 }
//   { status: 1, endDate: 1 }
```

### 8. `reviews`
```javascript
{
  _id: ObjectId,
  rideId: ObjectId,           // ref → rides._id, unique, indexed
  reviewerId: ObjectId,       // ref → users._id, indexed
  revieweeId: ObjectId,       // ref → users._id (driver), indexed
  rating: Number,             // 1-5
  comment: String,
  createdAt: Date
}
// Indexes:
//   { rideId: 1 } — unique
//   { revieweeId: 1, createdAt: -1 }
```

### 9. `audit_log`
```javascript
{
  _id: ObjectId,
  action: String,             // indexed
  userId: ObjectId,           // ref → users._id, indexed
  details: Object,
  ip: String,
  userAgent: String,
  createdAt: Date             // TTL index — auto-delete after 30 days
}
// Indexes:
//   { action: 1, createdAt: -1 }
//   { userId: 1, createdAt: -1 }
//   { createdAt: 1 } — TTL (expireAfterSeconds: 2592000)
```

### 10. `notifications`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref → users._id, indexed
  title: String,
  body: String,
  type: String,               // "ride_update" | "promo" | "system"
  data: Object,               // arbitrary payload
  isRead: Boolean,            // default false
  createdAt: Date
}
// Indexes:
//   { userId: 1, isRead: 1, createdAt: -1 }
```

### 11. `promo_codes`
```javascript
{
  _id: ObjectId,
  code: String,               // unique, indexed
  discountType: String,       // "percentage" | "fixed"
  discountValue: Number,
  minRideValue: Number,
  maxDiscount: Number,
  usageLimit: Number,
  usedCount: Number,          // default 0
  expiresAt: Date,
  isActive: Boolean,
  createdAt: Date
}
// Indexes:
//   { code: 1 } — unique
//   { isActive: 1, expiresAt: 1 }
```

### 12. `payment_intents`
```javascript
{
  _id: ObjectId,
  rideId: ObjectId,           // ref → rides._id, indexed
  stripePaymentIntentId: String, // unique, indexed
  amount: Number,
  status: String,             // "requires_payment_method" | "processing" | "succeeded" | "failed"
  clientSecret: String,
  createdAt: Date,
  updatedAt: Date
}
// Indexes:
//   { stripePaymentIntentId: 1 } — unique
//   { rideId: 1 }
```

### 13. `emergency_alerts`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref → users._id, indexed
  rideId: ObjectId,           // ref → rides._id, indexed
  location: {
    type: "Point",
    coordinates: [Number, Number]
  },
  status: String,             // "active" | "resolved"
  resolvedAt: Date,
  createdAt: Date
}
// Indexes:
//   { status: 1, createdAt: -1 }
//   { userId: 1, status: 1 }
```

### 14. `saved_locations`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref → users._id, indexed
  name: String,               // "Home", "Work", etc.
  address: String,
  coordinates: {
    type: "Point",
    coordinates: [Number, Number]
  },
  createdAt: Date,
  updatedAt: Date
}
// Indexes:
//   { userId: 1 }
//   { "coordinates": "2dsphere" }
```

### 15. `service_areas`
```javascript
{
  _id: ObjectId,
  name: String,
  boundary: {
    type: "Polygon",
    coordinates: [[[Number, Number]]]
  },
  isActive: Boolean,
  surgeMultiplier: Number,
  createdAt: Date,
  updatedAt: Date
}
// Indexes:
//   { "boundary": "2dsphere" }
```

### 16. `sms_log`
```javascript
{
  _id: ObjectId,
  phone: String,              // indexed
  message: String,
  type: String,               // "otp" | "notification" | "promo"
  status: String,             // "sent" | "failed"
  twilioSid: String,
  errorMessage: String,
  createdAt: Date
}
// Indexes:
//   { phone: 1, createdAt: -1 }
//   { createdAt: 1 } — TTL (expireAfterSeconds: 7776000) — 90 days
```

## Aggregation Pipelines (Key Queries)

### Find Nearby Available Drivers
```javascript
db.collection('drivers').aggregate([
  { $match: { isOnline: true, isAvailable: true } },
  { $geoNear: {
      near: { type: "Point", coordinates: [lng, lat] },
      distanceField: "distance",
      maxDistance: 5000,        // 5km radius
      spherical: true
  }},
  { $sort: { distance: 1 } },
  { $limit: 10 }
]);
```

### Monthly Revenue Report (Admin)
```javascript
db.collection('transactions').aggregate([
  { $match: { status: "completed", createdAt: { $gte: startOfMonth } } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      totalRevenue: { $sum: "$amount" },
      count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```

## Migration Plan

### Index Creation Script
```javascript
// scripts/create-indexes.js
async function createIndexes() {
  const db = await connect();
  
  await db.collection('users').createIndexes([
    { key: { phone: 1 }, unique: true },
    { key: { email: 1 }, sparse: true },
    { key: { role: 1 } },
  ]);

  await db.collection('drivers').createIndexes([
    { key: { userId: 1 }, unique: true },
    { key: { isOnline: 1, isAvailable: 1, currentLocation: "2dsphere" } },
    { key: { "vehicle.plateNumber": 1 }, unique: true },
  ]);

  await db.collection('otp').createIndexes([
    { key: { phone: 1, code: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);

  await db.collection('audit_log').createIndexes([
    { key: { action: 1, createdAt: -1 } },
    { key: { userId: 1, createdAt: -1 } },
    { key: { createdAt: 1 }, expireAfterSeconds: 2592000 },
  ]);
  // ... remaining indexes as above
}
```
