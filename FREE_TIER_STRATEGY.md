# Free-Tier Strategy

> **Goal:** Deliver a working ride-hailing graduation project with **zero operating cost**.
> **Constraint:** No service may exceed its free quota. No paid upgrades.

---

## Service Quotas & Monitoring

### Vercel Hobby

| Limit | Value | Monitoring | Action if Exceeded |
|-------|-------|-----------|-------------------|
| Function timeout | 10s | Vercel dashboard → Analytics → Duration | Split long queries; add explicit `.timeout(8000)` on DB calls |
| Bandwidth | 100 GB/mo | Vercel dashboard → Usage | Compress JSON responses; add ETag/304 for polling; reduce poll frequency |
| Concurrent executions | 3 | Not visible; estimate from analytics | Acceptable for graduation demo (<50 concurrent users) |
| Cron Jobs | Not available | N/A | Use MongoDB TTL indexes instead of scheduled cleanup |
| Team features | Not available | N/A | Single developer project |
| Custom domains | 1 | Vercel dashboard → Domains | vercel.app subdomain is free and sufficient for graduation |
| Serverless function regions | 1 (default) | Vercel dashboard | Single region (Washington D.C., iad1) — sufficient for Egypt demo |

**Mitigation Strategy:**
- All API responses under 8s (buffer below 10s limit)
- Enable response compression (`res.set('Content-Encoding', 'gzip')`) on large payloads
- Polling intervals at 3s minimum to stay within bandwidth
- No file proxying through Vercel (Cloudinary direct upload)

### MongoDB Atlas M0 (Free Tier)

| Limit | Value | Monitoring | Action if Exceeded |
|-------|-------|-----------|-------------------|
| Storage | 512 MB | Atlas dashboard → Cluster → Metrics → Disk Usage | TTL indexes on OTP (5min), audit_log (30d), notifications (7d); compress large fields |
| Connections | 100 | Atlas dashboard → Cluster → Metrics → Connections | Pool max 5 per instance × 3 concurrent = 15, well under limit |
| RAM | Shared (variable) | Atlas → Performance Advisor | Index hot queries; avoid collection scans |
| vCPU | Shared (burst) | Atlas → Real Time → CPU | Cache popular endpoints; stagger poll intervals |
| $geoNear with 2dsphere | Not supported | N/A | App-level distance sort after indexed find |
| Continuous backup | Not available | N/A | Manual `mongodump` weekly; document restore procedure |
| Data transfer | 5 GB/mo out | Atlas → Network → Security → Data Transfer | Minimize response sizes; use partial responses with field projection |

**Mitigation Strategy:**
- TTL indexes on all time-bounded collections (OTP, audit_log, notifications)
- `projection` in every query (never `return full document`)
- Index all query patterns (verify with `explain()` before deploying)
- Archive/deletion strategy: delete soft-deleted rides older than 90 days
- Monthly `mongodump` to local disk as backup

### Cloudinary Free

| Limit | Value | Monitoring | Action if Exceeded |
|-------|-------|-----------|-------------------|
| Storage | 25 GB | Cloudinary dashboard → Media Library → Storage | Delete unused uploads; max image size 800px; max 500KB per image |
| Bandwidth | 25 GB/mo | Cloudinary dashboard → Analytics → Bandwidth | Compress to WebP; serve transformed URLs with `f_auto,q_auto` |
| Transformations | 5,000 total | Cloudinary dashboard → Analytics → Transformations | Avoid unnecessary transforms; cache transformed URLs in DB |
| Max image size | 10 MB (upload limit) | Client-side validation | Reject files >5MB client-side before upload |
| Concurrent uploads | Limited (shared) | Cloudinary dashboard | Rare for graduation project; stagger if needed |

**Mitigation Strategy:**
- Upload directly from Flutter client (not proxied through Vercel)
- Set `maxFileSize: 5242880` (5MB) in Flutter image picker
- Use `f_auto,q_auto` in Cloudinary URL for automatic format/quality optimization
- Limit avatar uploads to 800×800px, ride images to 1920×1080px
- Delete old unused assets via Cloudinary Admin API periodically

### Firebase FCM (Free)

| Limit | Value | Notes |
|-------|-------|-------|
| Messages per day | Unlimited | No daily cap on FCM |
| Topics per app | Unlimited | Each user gets a personal topic |
| Subscriptions per device | Unlimited | Device can subscribe to multiple topics |
| Payload size | 4 KB max | Keep notification payloads minimal (title, body, data fields only) |
| Uptime SLA | None (best effort) | Acceptable for graduation project |

**Mitigation Strategy:**
- FCM is used exclusively for push notifications — no Firestore, no Realtime DB
- Notification payload contains only: `title`, `body`, `rideId`, `type`
- Full data fetched via REST polling after notification tap

---

## System Boundaries

### What We Can Build (Within Free Quotas)

| Feature | Implementation | Free-Tier Feasibility |
|---------|---------------|----------------------|
| User auth (OTP) | MongoDB `otp` collection + console SMS | ✅ TTL index auto-cleans OTPs |
| Ride CRUD | MongoDB `rides` collection | ✅ Sub-100 rides/day fits easily |
| Real-time updates | REST polling at 3-5s intervals | ✅ 100 users × 20 polls/min × 60 min = 120K requests/day, fits bandwidth |
| Chat | REST polling, 1000 chars/msg | ✅ Low storage, low bandwidth |
| Driver location | POLL driver location every 3s | ✅ 50 drivers × 20 updates/min = 86K writes/day |
| Push notifications | FCM topic push | ✅ Unlimited, free |
| Image upload | Cloudinary direct upload | ✅ 1000 images × 500KB = 500MB storage, 2% of quota |
| Admin dashboard | Aggregated MongoDB queries | ✅ Keep under 10s Vercel timeout; cache results |
| File storage | Cloudinary only (no local files) | ✅ No Vercel /tmp dependency |

### System Capacity Estimates

| Metric | Daily Estimate | Monthly Estimate | Quota | Buffer |
|--------|---------------|------------------|-------|--------|
| API requests (all endpoints) | 20,000 | 600,000 | Vercel Hobby bandwidth (~100M req/mo equivalent) | ✅ 99%+ |
| MongoDB writes | 5,000 | 150,000 | M0 unlimited writes (shared) | ✅ |
| MongoDB storage | 2 MB/day | 60 MB/mo | 512 MB | ✅ ~90% free |
| Cloudinary uploads | 20 images | 600 images | 25 GB | ✅ 98% free |
| Cloudinary bandwidth | 10 MB/day | 300 MB/mo | 25 GB | ✅ 98% free |
| FCM pushes | 500 | 15,000 | Unlimited | ✅ |

---

## When Free Tier Isn't Enough (Graduation Scope)

These scenarios are **out of scope** for the graduation project. Documented here for future reference.

### Scenario 1: Storage Exceeds 450MB
- **Trigger:** MongoDB M0 reaches 90% capacity
- **Before graduation:** Add TTL indexes early; delete test data; keep docs lean with projections
- **After graduation:** Upgrade to M2 ($9/mo) or M10 ($57/mo)

### Scenario 2: Bandwidth Exceeds 90GB/mo
- **Trigger:** Vercel Hobby bandwidth approaching limit
- **Before graduation:** Reduce poll intervals (3s → 5s); compress JSON; add ETag/304
- **After graduation:** Upgrade to Vercel Pro ($20/mo)

### Scenario 3: Cloudinary Runs Out
- **Trigger:** Storage or bandwidth approaching 90%
- **Before graduation:** Delete unused uploads; reduce image quality; limit uploads
- **After graduation:** Upgrade to Cloudinary Basic ($89/mo) or migrate to AWS S3

### Scenario 4: Need WebSockets
- **Trigger:** REST polling latency unacceptable
- **Before graduation:** Optimize polling (reduce intervals, add cache, use 304)
- **After graduation:** Deploy Socket.io on a $5/mo VPS (Hetzner, DigitalOcean) or upgrade Vercel

---

## Architecture Boundary Enforcement

```
CAN USE                           CANNOT USE
─────────                         ─────────
Vercel Hobby (serverless)         Vercel Pro / Enterprise
MongoDB Atlas M0 (shared)         M2+ clusters, Atlas Search
Cloudinary Free                   Cloudinary paid plans
Firebase FCM only                 Firestore, Realtime DB, Auth
In-memory Map cache               Redis, Memcached, any external cache
Console SMS (no Twilio)           Twilio, any paid SMS provider
Client-side image compression     Server-side image processing
REST polling                      WebSockets, SSE (optional but free)
Manual deploy (`vercel deploy`)   CI/CD pipeline, GitHub Actions
Console logging                   Sentry, LogRocket, Datadog
```

---

## Migration Path (Post-Graduation)

If this project continues beyond graduation, the recommended paid upgrade path is:

| Step | Service | Cost | Why |
|------|---------|------|-----|
| 1 | Vercel Pro | $20/mo | Cron jobs, 300s timeout, team features, 1K concurrent |
| 2 | MongoDB M10 | $57/mo | 2GB storage, dedicated vCPU, $geoNear, backups |
| 3 | Cloudinary Basic | $89/mo | 50GB storage, 50GB bandwidth, advanced transforms |
| 4 | Sentry Team | $26/mo | Error tracking with stack traces |
| 5 | Twilio | ~$0.01/SMS | Real SMS OTP |
| **Total** | | **~$192/mo** | |

For a graduation demo, **Step 0** (all free tier, $0/mo) is sufficient.
