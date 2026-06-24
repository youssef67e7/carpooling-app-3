const fs = require('fs');
const path = require('path');

const enPath = path.join('lib', 'l10n', 'en.json');
const arPath = path.join('lib', 'l10n', 'ar.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const additions = {
  en: {
    featureSafetyBody:
      'A few habits that keep every trip safer:\n\n• Confirm pickup and destination pins before you start.\n• Share live trip details with someone you trust while the ride is ongoing.\n• Check that driver and vehicle details in the app match in real life.\n• Use in-app actions to end the trip if something feels wrong.',
    featureAboutBody:
      'WERET connects passengers and drivers with simple booking and live tracking.\n\nThis build is for development and demo. Features may change as we improve reliability and coverage.',
    featureSavedPlacesBody:
      'Save frequent pickup or drop-off points for faster booking.\n\nSaving places will be enabled in a future update.',
    featureRideTipsBody:
      'Follow these steps for a smooth booking:\n\n• Allow location so WERET can center the map on you.\n• First tap on the map sets pickup; second tap sets destination.\n• Tap Request ride when both points are set and the map is not locked by an active trip.\n• After a driver accepts, watch them approach on the map.',
    featureNotificationsBody:
      'These switches apply on this device only (demo).\n\n• Trip status updates\n• Offers & news from WERET',
    inAppCallTitle: 'In-app call',
    driverTripFlowScreenTitle: 'Trips & map',
    driverTripFlowScreenBody:
      'Go online, accept rides from the list, drive to pickup, tap Start trip, then End trip at the destination. The passenger sees your live position on the map during the ride.',
    driverDemandScreenTitle: 'Getting more requests',
    driverDemandScreenBody:
      'Stay online in busy areas, keep location permission on, and pull to refresh the available-rides list while waiting.',
    driverInsightsScreenTitle: 'Driver tips',
    driverInsightsScreenBody:
      'Accept matching requests quickly, keep your vehicle info up to date, and review completed trips in History for fares and ratings.',
    driverVehicleScreenTitle: 'Vehicle profile',
    driverVehicleScreenBody:
      'Keep your profile and vehicle data accurate. Document uploads and admin review will unlock in a future fleet module.',
  },
  ar: {
    featureSafetyBody:
      'عادات بسيطة تزيد أمان الرحلة:\n\n• تأكد من دبابيس الانطلاق والوجهة قبل البدء.\n• شارك تفاصيل الرحلة المباشرة مع شخص تثق به أثناء السير.\n• قارن بيانات السائق والمركبة في التطبيق مع الواقع.\n• أنهِ الرحلة من التطبيق إذا شعرت بأي خطر.',
    featureAboutBody:
      'WERET يربط الركاب والسائقين بحجز بسيط وتتبع مباشر.\n\nهذا البناء للتطوير والتجربة. قد تتغير الميزات مع تحسين الاعتمادية والتغطية.',
    featureSavedPlacesBody:
      'احفظ نقاط الانطلاق أو الوصول المتكررة لحجز أسرع.\n\nحفظ الأماكن سيُفعّل في تحديث قادم.',
    featureRideTipsBody:
      'اتبع هذه الخطوات لطلب أنعم:\n\n• فعّل الموقع ليتمركز الخريطة على موقعك.\n• الضغطة الأولى على الخريطة تحدد الانطلاق، والثانية الوجهة.\n• اضغط «طلب رحلة» عند ضبط النقطتين وعدم قفل الخريطة برحلة نشطة.\n• بعد قبول السائق تابعه على الخريطة.',
    featureNotificationsBody:
      'هذه المفاتيح على هذا الجهاز فقط (تجريبي).\n\n• تحديثات حالة الرحلة\n• عروض وأخبار من WERET',
    inAppCallTitle: 'مكالمة داخل التطبيق',
    driverTripFlowScreenTitle: 'الرحلات والخريطة',
    driverTripFlowScreenBody:
      'اتصل أونلاين، اقبل الرحلات من القائمة، توجه للانطلاق، اضغط بدء الرحلة، ثم إنهاء الرحلة عند الوجهة. يرى الراكب موقعك المباشر على الخريطة أثناء السير.',
    driverDemandScreenTitle: 'زيادة الطلبات',
    driverDemandScreenBody:
      'ابقَ متصلاً في المناطق المزدحمة، أبقِ إذن الموقع مفعّلاً، واسحب لتحديث قائمة الرحلات المتاحة أثناء الانتظار.',
    driverInsightsScreenTitle: 'نصائح للسائق',
    driverInsightsScreenBody:
      'اقبل الطلبات المطابقة بسرعة، حدّث بيانات مركبتك، وراجع الرحلات المكتملة في السجل للأجرة والتقييمات.',
    driverVehicleScreenTitle: 'ملف المركبة',
    driverVehicleScreenBody:
      'حافظ على دقة ملفك وبيانات مركبتك. رفع المستندات ومراجعة الإدارة ستُفعّل في وحدة الأسطول لاحقاً.',
  },
};

const arOverrides = {
  paymentMethodPayPal: 'باي بال',
  paymentMethodStripe: 'سترايب',
  paymentMethodInstaPay: 'إنستاباي',
  adminActivityAudit: '{actor} — {summary}',
};

Object.assign(en, additions.en);
Object.assign(ar, additions.ar);
Object.assign(ar, arOverrides);

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

fs.writeFileSync(enPath, `${JSON.stringify(sortKeys(en), null, 2)}\n`, 'utf8');
fs.writeFileSync(arPath, `${JSON.stringify(sortKeys(ar), null, 2)}\n`, 'utf8');

// Remove stale duplicate locale files (easy_localization uses *.json only).
for (const stale of ['lib/l10n/en', 'lib/l10n/ar']) {
  if (fs.existsSync(stale)) fs.unlinkSync(stale);
}

console.log('Updated en/ar.json keys:', Object.keys(en).length);
console.log('Removed stale lib/l10n/en and lib/l10n/ar files');
