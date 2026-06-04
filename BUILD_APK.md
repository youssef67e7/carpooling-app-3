# بناء APK — WERET

## الطريقة 1: GitHub (موصى بها — جهازك 7GB RAM)

1. ارفع المشروع على GitHub
2. من المستودع: **Actions** → **Build Android APK** → **Run workflow**
3. بعد 15–25 دقيقة: افتح الـ run → **Artifacts** → حمّل `WERET-debug.apk`
4. انقل الملف للهاتف وثبّته (فعّل «مصادر غير معروفة»)

اختياري في GitHub **Settings → Secrets**:
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

وفي **Variables**:
- `EXPO_PUBLIC_API_URL` = `http://YOUR_PC_IP:3000`

---

## الطريقة 2: على جهازك (يتطلب ذاكرة كافية)

1. أغلق Chrome والبرامج الثقيلة
2. زِد **ملف الترحيل (Page file)** في Windows:
   - Settings → System → About → Advanced system settings
   - Performance → Settings → Advanced → Virtual memory → Change
   - Custom size: **16384 MB** (أو Automatic)
   - أعد تشغيل الجهاز
3. من جذر المشروع:

```powershell
npm run apk
```

الملف يظهر في: **`dist/WERET-debug.apk`**

---

## بعد التثبيت

- شغّل الـ API على نفس شبكة الواي فاي
- في `mobile/.env`: `EXPO_PUBLIC_API_URL=http://IP_الكمبيوتر:3000`
- Google Sign-In يحتاج تطبيق مبني (هذا الـ APK) وليس Expo Go
