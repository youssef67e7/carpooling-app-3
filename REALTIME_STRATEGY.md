# Phase 9 — Real-time Communication Strategy

## Current State: Socket.io (BROKEN on Vercel)

Socket.io requires persistent TCP connections. Vercel serverless functions are stateless and short-lived. Socket.io connections cannot survive between invocations.

**Impact**: Zero real-time communication in production. All real-time features are broken:
- Ride status updates to users
- Driver availability display
- Chat between user and driver
- Driver location tracking
- Push notifications (separately broken — Firebase misconfigured)

## Target: REST Polling

Replace all WebSocket events with HTTP polling. This works reliably on Vercel because each poll is a stateless HTTP request.

### Polling Endpoint Mapping

| Socket.io Event | REST Replacement | Method | Path | Poll Interval |
|----------------|-----------------|--------|------|--------------|
| `ride-status-update` | Ride status poll | GET | `/api/rides/:id/status` | 2s (active ride) |
| `ride-accepted` | Ride status poll | GET | `/api/rides/:id/status` | 2s |
| `ride-requested` | Available ride poll | GET | `/api/rides/requested` | 3s (driver) |
| `location-update` | Driver location poll | GET | `/api/drivers/:id/location` | 3s |
| `chat-message` | Chat messages poll | GET | `/api/chat/:rideId/messages?since=` | 3s |
| `new-notification` | Notifications poll | GET | `/api/notifications?since=` | 5s |
| `online-drivers` | Online drivers poll | GET | `/api/drivers/online` | 5s |

### Polling Implementation Details

#### Client-side (Flutter)
```dart
// Example: Ride status polling
Timer.periodic(Duration(seconds: 2), (_) async {
  final response = await http.get(
    Uri.parse('$baseUrl/rides/$rideId/status'),
    headers: {'Authorization': 'Bearer $token'},
  );
  if (response.statusCode == 304) return; // Not modified
  final data = json.decode(response.body);
  setState(() => rideStatus = data['data']['status']);
});
```

#### Server-side — Conditional Responses
```javascript
// Route handler for ride status
async function getRideStatus(req, res) {
  const { id } = req.params;
  const cacheKey = `ride_status:${id}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && req.headers['if-none-match'] === cached.etag) {
    return res.status(304).end();
  }
  
  const ride = await db.collection('rides').findOne(
    { _id: new ObjectId(id) },
    { projection: { status: 1, driverId: 1, updatedAt: 1 } }
  );
  
  const etag = `"${ride.updatedAt.getTime()}"`;
  cache.set(cacheKey, { etag, value: ride }, 3000);
  
  res.set('ETag', etag);
  res.json({ success: true, data: ride });
}
```

### Chat Implementation

```javascript
// GET /api/chat/:rideId/messages?since=2024-01-01T00:00:00Z
async function getMessages(req, res) {
  const { rideId } = req.params;
  const since = req.query.since ? new Date(req.query.since) : new Date(0);
  
  const messages = await db.collection('messages').find({
    rideId: new ObjectId(rideId),
    createdAt: { $gt: since }
  }).sort({ createdAt: 1 }).limit(50).toArray();
  
  res.json({ success: true, data: { messages } });
}

// POST /api/chat/:rideId/send
async function sendMessage(req, res) {
  const { rideId } = req.params;
  const { text } = req.body;
  
  const message = {
    rideId: new ObjectId(rideId),
    senderId: req.user._id,
    text,
    createdAt: new Date()
  };
  
  await db.collection('messages').insertOne(message);
  
  // TODO: Send push notification to other participant
  // pushService.sendToUser(otherUserId, "New message", text);
  
  res.status(201).json({ success: true, data: { message } });
}
```

### Driver Location Tracking

```javascript
// Driver sends location every 3-5s (battery-efficient)
// POST /api/drivers/location
async function updateLocation(req, res) {
  const { latitude, longitude } = req.body;
  
  await db.collection('drivers').updateOne(
    { userId: req.user._id },
    { $set: {
        currentLocation: { type: "Point", coordinates: [longitude, latitude] },
        lastLocationUpdate: new Date()
    }}
  );
  
  // Invalidate cache
  cache.del(`driver_location:${req.user._id}`);
  
  res.json({ success: true });
}

// User reads driver location
// GET /api/drivers/location/:driverId
async function getDriverLocation(req, res) {
  const { driverId } = req.params;
  const cacheKey = `driver_location:${driverId}`;
  
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });
  
  const driver = await db.collection('drivers').findOne(
    { userId: new ObjectId(driverId) },
    { projection: { currentLocation: 1, lastLocationUpdate: 1 } }
  );
  
  cache.set(cacheKey, driver, 3000);
  res.json({ success: true, data: driver });
}
```

### Driver Online Detection

Instead of Socket.io `connect`/`disconnect` events, use a heartbeat mechanism:

```javascript
// POST /api/drivers/heartbeat (called every 30s by Flutter)
async function heartbeat(req, res) {
  const now = new Date();
  await db.collection('drivers').updateOne(
    { userId: req.user._id },
    { $set: { lastHeartbeat: now } }
  );
  res.json({ success: true });
}

// GET /api/drivers/online (cached, called every 5s)
async function getOnlineDrivers(req, res) {
  const cacheKey = 'online_drivers';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });
  
  const cutoff = new Date(Date.now() - 60000); // 60s timeout
  const online = await db.collection('drivers').countDocuments({
    isOnline: true,
    lastHeartbeat: { $gt: cutoff }
  });
  
  const result = { onlineCount: online };
  cache.set(cacheKey, result, 5000);
  res.json({ success: true, data: result });
}
```

#### Cleanup Cron Job (Vercel Cron — every minute)
```javascript
// POST /api/cron/cleanup-drivers
async function cleanupDrivers(req, res) {
  const cutoff = new Date(Date.now() - 120000); // 2 min timeout
  await db.collection('drivers').updateMany(
    { isOnline: true, lastHeartbeat: { $lt: cutoff } },
    { $set: { isOnline: false, isAvailable: false } }
  );
  res.json({ success: true });
}
```

## Battery & Bandwidth Optimization

| Strategy | Details |
|----------|---------|
| Adaptive polling | Poll at 2s during active ride, 10s when idle, 30s when app backgrounded |
| Conditional requests | Use ETag/If-None-Match to return 304 Not Modified |
| Response trimming | Only return delta data (e.g., `?since=` for chat) |
| Request coalescing | Batch multiple polls into one request where possible |
| Backoff on error | Exponential backoff (1s, 2s, 4s, 8s... max 30s) on network errors |

## Migration Timeline

| Step | Description | Duration | Risk |
|------|-------------|----------|------|
| 1 | Create all polling endpoints | 2 days | Low |
| 2 | Add Server-Sent Events (SSE) endpoints | 1 day | Medium |
| 3 | Update Flutter app to use REST polling | 3 days | Medium |
| 4 | Remove Socket.io server + client code | 0.5 day | Low |
| 5 | Test with simulated concurrent rides | 1 day | Medium |
| 6 | Monitor and tune polling intervals | Ongoing | Low |

## Future Consideration: Server-Sent Events (SSE)

If REST polling proves too latency-sensitive (e.g., chat feels sluggish), SSE can be added as a middle ground:

- SSE is supported on Vercel via streaming responses
- Lower latency than polling (server pushes changes)
- Still HTTP-based (no WebSocket)
- Easier fallback: SSE → polling polyfill

```javascript
// GET /api/rides/:id/events (SSE endpoint — optional upgrade)
async function rideEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const interval = setInterval(async () => {
    const ride = await getRideStatus(req.params.id);
    res.write(`data: ${JSON.stringify(ride)}\n\n`);
  }, 2000);
  
  req.on('close', () => clearInterval(interval));
}
```

**Decision**: Start with REST polling. Evaluate SSE only if polling latency becomes a user-facing problem after launch.
