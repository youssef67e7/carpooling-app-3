# GitHub — `youssef67e7/carpooling-app-3`

| | |
|---|---|
| **Repository** | https://github.com/youssef67e7/carpooling-app-3 |
| **Remote** | `https://github.com/youssef67e7/carpooling-app-3.git` |
| **Branch** | `main` |

## رفع / تحديث المشروع

```powershell
cd "c:\Users\DELL\Desktop\ReachNative Car"
git add -A
git status
git -c user.name="youssef67e7" -c user.email="youssef67e7@users.noreply.github.com" commit -m "Your message"
git push origin main
```

## استبدال كامل لمحتوى الريبو (حذف التاريخ القديم)

استخدم فقط إذا أردت مسح كل commits السابقة على GitHub ورفع هذا المشروع فقط:

```powershell
git push --force origin main
```

## هوية Git (مرة واحدة)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

## أمان

- لا ترفع `.env` — مستثناة في `.gitignore`
- للإنتاج: راجع `backend/uploads/` (صور تجريبية قد تكون في الريبو)
