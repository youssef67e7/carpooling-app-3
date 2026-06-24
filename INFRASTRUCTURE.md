# Phase 5 — Infrastructure Specification

## Hosting Platform: Vercel (Serverless)

### Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [{ "src": "api/**/*.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/api/(.*)", "dest": "api/$1" }],
  "crons": [
    { "path": "/api/cron/cleanup-otp", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/cleanup-audit", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/aggregate-stats", "schedule": "0 * * * *" }
  ]
}
```

### Current Limitations
- 10s function timeout (hard limit)
- 50MB response limit (per-request)
- Ephemeral filesystem (`/tmp` only, 512MB)
- No WebSocket support (Socket.io incompatible)
- 1 concurrent request per function instance (scale-out only)
- Cold start: ~200-500ms (mitigated by Keep Alive)

### Mitigation Strategy
| Limitation | Mitigation |
|-----------|------------|
| 10s timeout | All DB ops < 3s; cache hot data; use `aggregate()` not JS loops |
| Ephemeral /tmp | No local file storage; all uploads go directly to Cloudinary |
| No WebSocket | REST polling (2-5s intervals) |
| Cold start | Keep-alive pings every 5 min; minimal module imports |
| Function concurrency | Acceptable for current scale; upgrade to Vercel Pro for 1K concurrent |

## Database: MongoDB Atlas

### Cluster Configuration
- **Tier**: M2 (current) → M10 (production target)
- **Region**: AWS `us-east-1` (same as Vercel functions)
- **Storage**: 10GB minimum
- **Backup**: Atlas continuous backup (every 6 hours)
- **Network**: IP whitelist: Vercel NAT ranges only

### Connection Pooling
- `mongodb` native driver with connection pooling
- Pool size: 10 (per Vercel function instance)
- `serverSelectionTimeoutMS`: 5000
- `socketTimeoutMS`: 30000
- `maxIdleTimeMS`: 60000

### Index Strategy
All indexes must be created before deployment. See `DATABASE_SPEC.md` for full schema.

## Caching Strategy

### In-Memory Cache (per Vercel instance)
```
Cache: Map<string, { value: any, expiresAt: number }>

TTL values:
  - online_drivers        → 5s
  - ride_status:{rideId}  → 3s
  - driver_location:{id}  → 3s
  - active_ride_count     → 5s
  - static_config         → 60s
  - promo_codes           → 120s
```

**Note**: In-memory cache is NOT shared across Vercel instances. Acceptable for current scale (<100 concurrent users). For scale-out beyond 500 concurrent users, migrate to Redis (Upstash).

### Cache Invalidation
- On write to relevant entity → remove cache key for that entity
- TTL-based expiration (no LRU eviction needed at current scale)
- Cache keys follow pattern: `{entity}:{id}:{field}`

## Monitoring & Observability

### Implemented
- Vercel Analytics (basic — request count, errors, latency)
- MongoDB Atlas monitoring (CPU, connections, ops)

### To Implement
| Tool | Purpose | Priority |
|------|---------|----------|
| Sentry | Error tracking with stack traces | High |
| MongoDB slow query log | Identify slow queries (>100ms) | High |
| Vercel Log Drains | Export logs to external analysis | Medium |
| Uptime monitoring (Better Uptime) | External health checks | Medium |
| Dashboard (Grafana) | Visualization of key metrics | Low |

### Key Metrics to Track
| Metric | Target | Alert at |
|--------|--------|----------|
| API p95 latency | <500ms | >1s |
| DB query time | <100ms | >500ms |
| Error rate | <0.1% | >1% |
| Cold start rate | <5% of requests | >20% |
| Cache hit rate | >60% | <30% |
| Monthly bandwidth | <100 GB | >80 GB (warning) |

## CI/CD Pipeline

### Current
- Vercel auto-deploys from `main` branch
- No preview deployments
- No testing in pipeline

### Target
```
Git push → GitHub Actions → Lint → Test (unit + integration) → Build →
Preview deploy (staging) → E2E tests → Merge to main → Production deploy
```

### GitHub Actions Workflow
```yaml
name: CI/CD
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel deploy --preview --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Security Infrastructure

### Current (Broken)
| Security Measure | Status |
|-----------------|--------|
| Rate limiting | No-op on Vercel |
| CORS | Wide open (`*`) |
| Secrets | Committed to git |
| IP whitelist | Hardcoded in admin routes |
| HTTPS | Enforced by Vercel (good) |
| DB network | Open to all (should be Vercel IPs only) |

### Target
| Measure | Implementation | Priority |
|---------|---------------|----------|
| Rate limiting | Vercel Edge middleware + in-function limiter | High |
| CORS whitelist | Configurable via env (comma-separated origins) | High |
| Secrets | Vercel env vars, `.env.*` in `.gitignore` | High |
| IP whitelist | Read from env, updatable without redeploy | Medium |
| HTTPS | Already enforced (Vercel) | Already done |
| DB firewall | Atlas IP whitelist: Vercel ranges only | High |
| Security headers | `helmet` middleware | Medium |
| Input sanitization | Zod + strip HTML | Medium |

## Scalability Limits

| Dimension | Current Limit | Target | How |
|-----------|-------------|--------|-----|
| Concurrent users | ~50 (est.) | 500 | Cache + indexed queries + aggregation pipeline |
| Rides/hour | ~200 | 2000 | Remove ODM overhead, add indexes |
| Response time (p95) | ~3s (admin stats) | <500ms | Parallel queries + native aggregation |
| DB connections | 10 per instance | 50 | Pool sizing + Vercel Pro |
| Monthly bandwidth | ~80 GB (est.) | <500 GB | Compression + conditional requests |
| Storage | 10GB | 100GB | MongoDB Atlas scaling |

## Cost Projection

| Service | Current | Target | Delta |
|---------|---------|--------|-------|
| Vercel Hobby | $0/mo | $20/mo (Pro) | +$20 |
| MongoDB Atlas M2 | $0/mo (free) | $57/mo (M10) | +$57 |
| Cloudinary Free | $0/mo | $0/mo (free tier) | $0 |
| Twilio | Pay-as-you-go | Pay-as-you-go | $0 |
| Firebase (FCM) | $0/mo | $0/mo (free) | $0 |
| Sentry | $0/mo | $0/mo (free tier) | $0 |
| **Total** | **$0/mo (unusable)** | **~$77/mo** | **+$77** |
