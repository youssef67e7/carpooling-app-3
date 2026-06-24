# Phase 14 — Deployment Guide

## Prerequisites

### Accounts
- [Vercel](https://vercel.com) account (Hobby tier → Pro for production)
- [MongoDB Atlas](https://cloud.mongodb.com) account (M2 free tier → M10 for production)
- [Cloudinary](https://cloudinary.com) account (Free tier)
- [Twilio](https://twilio.com) account (with verified phone number)
- [Firebase Console](https://console.firebase.google.com) project (for FCM)
- [Sentry](https://sentry.io) account (Free tier — optional)
- [GitHub](https://github.com) repository

### Local Tools
- Node.js 18+ and npm
- Flutter SDK 3.x (for mobile builds)
- Git
- Vercel CLI: `npm i -g vercel`

## Environment Variables

### Vercel Production
Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=<generated with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
TWILIO_ACCOUNT_SID=<from Twilio console>
TWILIO_AUTH_TOKEN=<from Twilio console>
TWILIO_PHONE_NUMBER=+1234567890
CLOUDINARY_CLOUD_NAME=<from Cloudinary dashboard>
CLOUDINARY_API_KEY=<from Cloudinary dashboard>
CLOUDINARY_API_SECRET=<from Cloudinary dashboard>
CLOUDINARY_UPLOAD_PRESET=reachnative_profile_uploads
EMAIL_USER=<gmail address>
EMAIL_PASS=<gmail app password>
FIREBASE_PROJECT_ID=<from Firebase project settings>
FIREBASE_CLIENT_EMAIL=<from Firebase service account>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SENTRY_DSN=<from Sentry project>
NODE_ENV=production
ADMIN_IP_WHITELIST=203.0.113.1,203.0.113.2
CORS_ORIGINS=https://admin.reachnativecar.com
```

### Vercel Staging
Same variables, but:
- `MONGODB_URI` → separate staging cluster
- `NODE_ENV=staging`
- `CORS_ORIGINS` → staging URLs

## Deployment Steps

### 1. Initial Vercel Setup

```bash
# Login to Vercel CLI
vercel login

# Link project
vercel link

# Deploy to preview (staging)
vercel deploy --preview

# Deploy to production
vercel deploy --prod
```

### 2. MongoDB Atlas Setup

```bash
# Create indexes (run ONCE after DB is connected)
node scripts/create-indexes.js

# Verify indexes
node -e "
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const indexes = await db.collection('rides').indexes();
  console.log(indexes);  // Verify: status+createdAt compound index exists
  await client.close();
"
```

### 3. Vercel Cron Jobs

Configure in `vercel.json` (see INFRASTRUCTURE.md):
```json
{
  "crons": [
    { "path": "/api/cron/cleanup-otp", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/cleanup-audit", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/aggregate-stats", "schedule": "0 * * * *" }
  ]
}
```

Note: Crons require Vercel Pro ($20/mo) or above. On Hobby tier, crons won't run — TTL indexes handle OTP/audit cleanup automatically.

### 4. Domain Configuration

```bash
# Add custom domain via Vercel Dashboard:
# Project → Settings → Domains → Add
# DNS: Create CNAME record pointing to cname.vercel-dns.com

# Verify HTTPS auto-enables (Let's Encrypt)
```

### 5. Post-Deployment Verification

```bash
# Health check
curl https://yourdomain.com/api/health

# Auth flow
curl -X POST https://yourdomain.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# Verify CORS
curl -H "Origin: https://evil.com" -I https://yourdomain.com/api/health
# → Should NOT include Access-Control-Allow-Origin: *
```

### 6. Monitoring Setup

```bash
# Verify Sentry is capturing errors
curl https://yourdomain.com/api/test-error  # Should 500

# Check Vercel Analytics dashboard for:
# - p95 latency < 500ms
# - Error rate < 0.1%
# - Cache hit rate > 60%
```

## CI/CD Pipeline Setup

### GitHub Actions
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main, staging]

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
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          vercel-args: '--preview'

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          vercel-args: '--prod'
```

## Rollback Procedure

### Via Vercel Dashboard
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Click "..." → "Promote to Production"

### Via CLI
```bash
# List deployments
vercel list

# Rollback to specific deployment
vercel rollback <deployment-url-or-id>
```

### Database Rollback
MongoDB Atlas continuous backups:
1. Go to Atlas → Cluster → Backups
2. Select restore point (before problematic deployment)
3. Click "Restore" → "Link to new cluster" (safe) or "Replace existing" (destructive)

## Maintenance

### Weekly
- Check Vercel Analytics for error spikes
- Review MongoDB Atlas CPU/connections graphs
- Check Sentry for new error patterns

### Monthly
- Review and rotate secrets if needed
- Check Cloudinary storage usage
- Flutter: Check for package updates (especially firebase_messaging)

### Quarterly
- Review MongoDB index usage (remove unused indexes)
- Audit CORS whitelist
- Update Node.js version on Vercel
- Run full integration test suite
