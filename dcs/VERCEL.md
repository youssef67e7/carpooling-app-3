# نشر المشروع على Vercel + MongoDB Atlas

## ماذا يُنشر؟

| جزء | Vercel | MongoDB Atlas |
|-----|--------|---------------|
| **API + لوحة الإدارة** | نعم (`backend/`) | — |
| **Database** | — | Cluster Atlas (`weret`) |
| **رفع الصور** | قرص محلي أو S3 (حسب `UPLOAD_STORAGE`) | — |
| **تطبيق Flutter** | لا (APK / stores) | عبر الـ API فقط |

---

## 1) MongoDB Atlas

1. أنشئ Cluster على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Database Access** → مستخدم + كلمة مرور (SCRAM)
3. **Network Access** → أضف IP جهازك أو `0.0.0.0/0` للتطوير
4. انسخ connection string → `MONGODB_URI` في `backend/.env`

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster....mongodb.net/weret?retryWrites=true&w=majority
MONGODB_DB_NAME=weret
MONGODB_ATLAS_REQUIRED=1
```

تهيئة أول مرة:

```bash
npm run init:mongo --prefix backend
npm run mongo:test-atlas --prefix backend
```

---

## 2) Vercel Environment Variables

| Variable | Value |
|----------|--------|
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB_NAME` | `weret` |
| `JWT_SECRET` | سلسلة عشوائية طويلة |
| `MONGODB_ATLAS_REQUIRED` | `1` |
| `GOOGLE_OAUTH_WEB_CLIENT_ID` | (اختياري) |

---

## 3) Flutter

```env
# dart-define عند التشغيل / البناء
API_URL=https://YOUR-PROJECT.vercel.app
```

---

## 4) التحقق

- `GET /health` → `"mongoMode": "atlas"`, `"database": true`
- `npm run mongo:verify --prefix backend` — اختبار إضافة/حذف في MongoDB

Collections: `users`, `rides`, `wallet_accounts`, `transactions`, …
