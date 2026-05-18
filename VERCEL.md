# نشر المشروع على Vercel

## ماذا يُنشر؟

| جزء | Vercel | ملاحظة |
|-----|--------|--------|
| **API + لوحة الإدارة** (`backend/`) | نعم | Root Directory = `backend` |
| **تطبيق الموبايل** (`mobile/`) | لا | Expo — استخدم EAS Build |
| **Socket.IO / محاكاة السائقين** | لا على Vercel | شغّل الـ API محلياً أو على Railway للميزات الكاملة |

على Vercel يعمل: REST API، `/health`، `/admin-ui/`، MongoDB Atlas.

---

## 1) MongoDB Atlas (مطلوب)

1. أنشئ cluster مجاني على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. انسخ connection string مثل:  
   `mongodb+srv://USER:PASS@cluster.xxx.mongodb.net/ridehail?retryWrites=true&w=majority`
3. في Atlas → **Network Access** → أضف `0.0.0.0/0` (للتجربة) أو IPs الخاصة بـ Vercel

---

## 2) ربط GitHub بـ Vercel

1. ادخل [vercel.com](https://vercel.com) وسجّل بحساب GitHub
2. **Add New Project** → Import **`youssef67e7/carpooling-app-3`**
3. **Root Directory:** اضغط Edit واختر **`backend`**
4. Framework Preset: **Other**
5. **Environment Variables** (Production):

| Variable | Value |
|----------|--------|
| `MONGODB_URI` | رابط Atlas |
| `JWT_SECRET` | سلسلة عشوائية طويلة (32+ حرف) |
| `GOOGLE_OAUTH_WEB_CLIENT_ID` | (اختياري) لتسجيل Google |
| `TRUST_PROXY_HOPS` | `1` |

6. **Deploy**

بعد النشر:

- API: `https://YOUR-PROJECT.vercel.app/health`
- لوحة الإدارة: `https://YOUR-PROJECT.vercel.app/admin-ui/`

في لوحة الإدارة، ضع **نفس عنوان Vercel** في حقل API (أو اتركه فارغاً إذا فتحتها من نفس الدومين).

---

## 3) تطبيق الموبايل → API على Vercel

في `mobile/.env` (أو Expo env):

```env
EXPO_PUBLIC_API_FULL_URL=https://YOUR-PROJECT.vercel.app
```

أعد تشغيل Expo.

---

## 4) نشر يدوي (CLI)

```powershell
npm i -g vercel
cd "c:\Users\DELL\Desktop\ReachNative Car\backend"
vercel login
vercel link
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel --prod
```

---

## قيود Vercel

- **رفع الملفات** (`/upload`) غير دائم على القرص — للإنتاج استخدم S3 / Cloudinary أو شغّل الـ API على Railway
- **Socket.IO** لا يعمل على Serverless — التطبيق يستخدم polling كبديل
- **مهلة الدالة:** 30 ثانية كحد أقصى (خطة مجانية)

للإنتاج الكامل: Vercel للـ API الأساسي + **Railway/Render** إذا احتجت WebSockets ورفع ملفات.
