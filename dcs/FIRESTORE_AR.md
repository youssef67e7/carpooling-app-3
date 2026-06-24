# تهيئة Firestore على السحابة — مشروع youssef-f757e

## 1) إنشاء Firestore

Firebase Console → **Firestore Database** → **Create database** → Production mode

## 2) Security Rules (انسخ من المشروع)

Firebase Console → Firestore → **Rules** → الصق محتوى:

[`firebase/firestore.rules`](../firebase/firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if request.auth != null; // scoped per collection — see full file
      allow write: if false;
    }
  }
}
```

> بعد تسجيل الدخول، التطبيق يستدعي `POST /auth/firebase-token` ثم يفتح **Firestore listeners** مباشرة. الكتابة (إنشاء رحلة، سحب، إلخ) تبقى عبر API.

## 3) Service Account (مفتاح السيرفر)

1. Firebase Console → ⚙️ **Project settings** → **Service accounts**
2. **Generate new private key** → حمّل ملف JSON
3. في `backend/.env` — اختر **طريقة واحدة**:

**أ) ملف (أسهل):**
```env
FIREBASE_PROJECT_ID=youssef-f757e
GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account.json
```
ضع الملف في `backend/firebase-service-account.json`

**ب) سطر واحد:**
```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"youssef-f757e",...}
```

## 4) تهيئة البيانات على السحابة

```bash
cd backend
npm install
npm run init:firestore
```

ينشئ:
- `_meta/schema` — قائمة الـ 15 collection
- `_meta/demo_accounts` — حسابات تجريبية للاختبار
- **vehicles** — 6 أنواع خدمة
- **admin_accounts** — من `ADMIN_PASSWORD_*` في `.env`
- **users** — 6 سائقين + 2 راكب تجريبي
- **wallet_accounts** + **transactions** — أرصدة تجريبية
- **driver_profiles** + **passenger_profiles**

### حسابات تجريبية

| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| أدمن | `youssef@gmail.com` | من `ADMIN_PASSWORD_YOUSSEF` |
| أدمن | `youssef1@gmail.com` | من `ADMIN_PASSWORD_YOUSSEF1` |
| راكب | `passenger1@demo.local` | `demo123` |
| راكب | `passenger2@demo.local` | `demo123` |
| سائق | `driver1@demo.local` … `driver6@demo.local` | `driver123` |

> إذا ظهر `RESOURCE_EXHAUSTED: Quota exceeded` — انتظر 15–60 دقيقة ثم أعد `npm run init:firestore`، أو رفع خطة Blaze في Firebase.

### حل خطأ Quota exceeded

| السبب | الحل |
|--------|------|
| خطة Spark مجانية | Firebase Console → Upgrade to **Blaze** (الدفع حسب الاستخدام) |
| محاكاة السائقين كل 4 ثوانٍ | في `backend/.env`: `SIMULATION_ENABLED=0` (الافتراضي الآن) |
| listeners على كل users/rides | Admin web: لا تفعّل `ADMIN_FIRESTORE_LIVE` |
| seed + إعادة تشغيل السيرفر | انتظر أو استخدم Blaze |

بعد التعديلات أعد تشغيل السيرفر:
```bash
cd backend && npm run dev
```

## 5) تشغيل السيرفر

```bash
npm run dev
```

تحقق: `http://localhost:3000/health` → `"firebase": true`

---

## Collections (15)

| Collection | المحتوى |
|------------|---------|
| `users` | حسابات الركاب والسائقين |
| `vehicles` | أنواع الرحلات والأسعار |
| `rides` | الرحلات |
| `bookings` | حجوزات المقاعد |
| `messages` | محادثات الرحلة |
| `wallet_accounts` | المحافظ |
| `transactions` | المعاملات |
| `driver_profiles` | بيانات السائق |
| `passenger_profiles` | بيانات الراكب |
| `admin_accounts` | دخول الأدمن |
| `phone_login_otps` | OTP الهاتف |
| `reports` | البلاغات |
| `withdrawal_requests` | السحب |
| `admin_audit_logs` | سجل الأدمن |
| `driver_documents` | مستندات السائق |

التفاصيل: [`docs/FIRESTORE_SCHEMA.md`](FIRESTORE_SCHEMA.md)
