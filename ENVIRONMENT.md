# Environment Variables

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `JWT_SECRET` | JWT signing key (64+ hex chars) | `crypto.randomBytes(64).toString("hex")` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `mycloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcdef123456` |
| `EMAIL_OTP_SECRET` | OTP hashing key | `crypto.randomBytes(32).toString("hex")` |

## Admin Accounts

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD_YOUSSEF` | Password for `youssef@gmail.com` admin account |
| `ADMIN_PASSWORD_YOUSSEF1` | Password for `youssef1@gmail.com` admin account |

## CORS

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGINS` | Comma-separated allowed origins | Deny all |

## Server

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP listen port | `3000` |
| `TRUST_PROXY_HOPS` | Reverse proxy hop count | `1` |
| `NODE_ENV` | Environment name | `production` |

## Optional

| Variable | Description |
|----------|-------------|
| `GOOGLE_WEB_CLIENT_ID` | Google Sign-In Web Client ID |
| `MONGODB_ATLAS_REQUIRED` | Set `1` to refuse startup without Atlas |
| `MONGODB_DB_NAME` | Database name (default: `weret`) |
| `SIMULATION_ENABLED` | Set `1` to enable driver movement simulation |
| `SIMULATION_INTERVAL_MS` | Simulation tick interval (default: `4000`) |

## Test-Only

| Variable | Description |
|----------|-------------|
| `MONGODB_URI=memory` | Use in-memory MongoDB for tests |
| `NODE_ENV=test` | Test mode (disables production guards, uses dev OTP) |