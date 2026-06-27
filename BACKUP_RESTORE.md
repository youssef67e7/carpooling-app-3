# MongoDB Backup & Restore

## Prerequisites

- MongoDB Database Tools (`mongodump`, `mongorestore`) — [install guide](https://www.mongodb.com/docs/database-tools/installation/)
- Connection string with database access

## Backup

### Atlas (recommended)

Use Atlas native snapshots or:

```bash
mongodump \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/weret" \
  --out=./backups/weret-$(date +%Y%m%d-%H%M%S) \
  --gzip
```

### Local / Docker

```bash
mongodump \
  --uri="mongodb://127.0.0.1:27017/weret" \
  --out=./backups/weret-$(date +%Y%m%d-%H%M%S) \
  --gzip
```

### Docker (running container)

```bash
docker exec -t weret-mongo-1 mongodump \
  --uri="mongodb://127.0.0.1:27017/weret" \
  --out=/data/db/backup-$(date +%Y%m%d-%H%M%S)
docker cp weret-mongo-1:/data/db/backup-* ./backups/
```

## Restore

```bash
mongorestore \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/weret" \
  --dir=./backups/weret-20260101-120000 \
  --drop \
  --gzip
```

## Automated Backup Script

```bash
#!/bin/bash
# save as scripts/backup.sh and run via cron
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mongodump --uri="$MONGODB_URI" --out="./backups/$TIMESTAMP" --gzip
# Keep last 7 days, remove older
find ./backups -name "weret-*" -mtime +7 -exec rm -rf {} \;
```

## Key Collections

| Collection | Purpose | Backup Priority |
|------------|---------|-----------------|
| `users` | User accounts and profiles | Critical |
| `rides` | Ride history | Critical |
| `wallet_accounts` | Wallet balances | Critical |
| `transactions` | Financial transactions | Critical |
| `refresh_tokens` | Active sessions | High |
| `notifications` | Push notification logs | Low |
| `disputes` | Dispute records | Medium |
| `messages` | Chat messages | Medium |

## Disaster Recovery

1. Provision new MongoDB Atlas cluster
2. Restore latest backup using `mongorestore`
3. Update `MONGODB_URI` in `.env`
4. Restart backend
5. Verify `GET /health` returns `{"ok":true,"database":true}`