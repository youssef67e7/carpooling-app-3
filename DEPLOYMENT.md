# Production Deployment Guide

## Prerequisites

- Docker and Docker Compose (recommended)
- MongoDB Atlas cluster (or managed MongoDB)
- Cloudinary account for image uploads
- SMTP credentials for email (configured via nodemailer)
- Google Cloud Console project for Google Sign-In (optional)

---

## 1. Environment Setup

```bash
cp backend/.env.production backend/.env
```

Edit `backend/.env` with your production values (see [ENVIRONMENT.md](./ENVIRONMENT.md)).

### Generate secrets

```bash
# JWT secret (64 bytes hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Email OTP secret (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Docker Deployment

```bash
# Build and start all services
docker compose up --build -d

# Check logs
docker compose logs -f backend

# Verify health
curl http://localhost:3000/health
```

### Without Docker

```bash
cd backend
npm install --production
node src/index.js
```

---

## 3. MongoDB Indexes

Indexes are created automatically on first startup via `ensureMongoIndexes()`.

To manually verify:

```bash
npm run mongo:verify
```

---

## 4. Cloudinary Setup

1. Create a Cloudinary account
2. Copy the cloud name, API key, and API secret to `.env`
3. Uploaded profile images are stored in Cloudinary

---

## 5. Admin Accounts

Two fixed admin accounts are pre-configured:

| Email | Password Env Var |
|-------|-----------------|
| `youssef@gmail.com` | `ADMIN_PASSWORD_YOUSSEF` |
| `youssef1@gmail.com` | `ADMIN_PASSWORD_YOUSSEF1` |

Set at least one password in `.env` to enable admin login.

---

## 6. SSL / Reverse Proxy

It is strongly recommended to run behind Nginx or Caddy for TLS termination.

Example Nginx config:

```nginx
server {
    listen 443 ssl;
    server_name api.weret.app;

    ssl_certificate /etc/letsencrypt/live/api.weret.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.weret.app/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 7. Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Overall health (DB, collections, file storage) |
| `GET /api/health` | Same as `/health` |

The Docker HEALTHCHECK uses `GET /health` every 30s.

---

## 8. Monitoring

- Check `GET /health` for database connectivity
- Check `GET /debug/env` (non-production) for configuration status
- Logs are written to `logs/` directory and rotated automatically

---

## 9. Verification Checklist

- [ ] `MONGODB_URI` points to production Atlas cluster
- [ ] `JWT_SECRET` is a strong random value
- [ ] `CLOUDINARY_*` vars are set
- [ ] `EMAIL_OTP_SECRET` is set
- [ ] At least one `ADMIN_PASSWORD_*` is set
- [ ] `CORS_ORIGINS` includes your app domain(s)
- [ ] `MONGODB_ATLAS_REQUIRED=1` (prevents memory fallback in production)
- [ ] Docker image builds without errors
- [ ] Health endpoint returns `{"ok":true,"database":true}`