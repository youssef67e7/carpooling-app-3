/**
 * WERET Admin web — same APIs and visual tokens as mobile (`/auth`, `/admin/*`).
 * PATCH /admin/users/:id — body: { is_verified, is_blocked, blocked_until, block_reason }
 */

const TOKEN_KEY = "admin_token";
const API_BASE_KEY = "admin_api_base";

const FIXED_ADMIN_EMAILS = ["youssef@gmail.com", "youssef1@gmail.com"];

const LANG_KEY = "admin_web_lang";
let lang = "ar";
try {
  const s = localStorage.getItem(LANG_KEY);
  if (s === "en" || s === "ar") lang = s;
} catch {}

/** @type {Record<'ar'|'en', Record<string, string>>} */
const STR = {
  ar: {
    pageTitle: "لوحة الإدارة — WERET",
    modal_default_title: "تأكيد",
    modal_cancel: "إلغاء",
    modal_ok: "تأكيد",
    login_brand_title: "لوحة إدارة WERET",
    login_brand_sub: "نفس API التطبيق — صلاحيات موحدة",
    login_heading: "تسجيل الدخول",
    login_secure_note: "مسؤولون ثابتون فقط (مصادقة الخادم).",
    label_api: "عنوان الخادم (API)",
    ph_api: "فارغ = نفس المنشأ (/admin-ui/)",
    label_name: "الاسم",
    label_email: "البريد",
    label_phone: "الهاتف",
    label_password: "كلمة المرور",
    btn_login: "دخول",
    nav_brand_sub: "لوحة الإدارة",
    nav_panel_tag: "لوحة الإدارة",
    nav_group_main: "الرئيسية",
    nav_group_ops: "العمليات",
    nav_group_insights: "التحليلات",
    nav_role_admin: "Super Admin",
    nav_overview: "لوحة التحكم",
    nav_users: "المستخدمون",
    nav_rides: "الرحلات",
    nav_reports: "البلاغات",
    nav_tx: "المعاملات",
    nav_audit: "سجل القرارات",
    btn_logout: "تسجيل الخروج",
    ph_search: "بحث في القائمة الحالية…",
    btn_refresh: "تحديث",
    page_prev: "السابق",
    page_next: "التالي",
    page_of: "صفحة {page} من {totalPages}",
    page_range: "عرض {from}–{to} من {total}",
    sec_overview: "لوحة التحكم",
    page_eyebrow: "WERET",
    hero_overview_sub: "نظرة عامة على المنصة — مستخدمون، رحلات، ونشاط مباشر.",
    hero_users_sub: "إدارة حسابات الركاب والسائقين — توثيق، حظر، وقبول الطلبات.",
    hero_rides_sub: "متابعة الرحلات وحالاتها من طلب حتى الإغلاق.",
    hero_reports_sub: "مراجعة البلاغات وتحديث حالتها.",
    hero_tx_sub: "مراقبة المعاملات المالية وتعليم الحالات المشبوهة.",
    hero_audit_sub: "سجل قرارات الإدارة للمراجعة والمساءلة.",
    sec_users: "المستخدمون",
    sec_rides: "الرحلات",
    sec_reports: "البلاغات",
    sec_tx: "المعاملات",
    sec_audit: "سجل القرارات",
    th_name: "الاسم",
    th_email: "البريد",
    th_role: "الدور",
    th_status: "الحالة",
    th_online: "متصل",
    th_vehicle: "مركبة",
    th_actions: "إجراءات",
    th_ride_status: "الحالة",
    th_passenger: "الراكب",
    th_driver: "السائق",
    th_fare: "الأجرة",
    th_date: "تاريخ",
    th_reason: "السبب",
    th_reporter_target: "مُبلِغ ← مُبلَّغ عنه",
    th_description: "وصف",
    th_update_status: "تحديث الحالة",
    th_user: "المستخدم",
    th_type: "النوع",
    th_amount: "المبلغ",
    tx_status_hdr: "الحالة",
    th_flagged: "علامة",
    th_single_action: "إجراء",
    th_time: "وقت",
    th_decision: "القرار",
    th_admin: "المسؤول",
    th_target: "الهدف",
    th_summary: "ملخص",
    confirm_type_prompt: 'اكتب "{phrase}" للتأكيد:',
    stats_users: "المستخدمون",
    stats_rides: "الرحلات",
    stats_drivers_online: "سائقون متصلون",
    stats_active_rides: "رحلات نشطة",
    stats_avg_rating: "متوسط التقييم",
    stats_total_ratings: "عدد التقييمات",
    stats_open_reports: "بلاغات مفتوحة",
    stats_completed_rides: "رحلات مكتملة",
    stats_pending_drivers: "طلبات سائقين",
    stats_flagged_tx: "معاملات مشبوهة",
    stats_total_drivers: "سائقون معتمدون",
    dash_live_title: "مركز القيادة المباشر",
    dash_live_sub: "{online} سائق متصل · {active} رحلة نشطة · {reports} بلاغ مفتوح",
    dash_updated: "آخر تحديث {time}",
    dash_rides_breakdown: "توزيع الرحلات",
    dash_quick_actions: "إجراءات سريعة",
    dash_recent_activity: "النشاط الأخير",
    dash_no_activity: "لا يوجد نشاط بعد — ستظهر الرحلات والقرارات هنا.",
    dash_action_users: "المستخدمون",
    dash_action_rides: "الرحلات",
    dash_action_reports: "البلاغات",
    dash_action_tx: "المعاملات",
    dash_action_audit: "سجل القرارات",
    dash_action_pending: "طلبات سائقين",
    ride_status_pending: "قيد الانتظار",
    ride_status_accepted: "مقبولة",
    ride_status_ongoing: "جارية",
    ride_status_completed: "مكتملة",
    ride_status_cancelled: "ملغاة",
    activity_ride: "رحلة {status} — {passenger}",
    activity_audit: "{actor}: {summary}",
    th_rating: "التقييم",
    th_review: "مراجعة",
    th_report_date: "التاريخ",
    stats_rides_prefix: "رحلات:",
    yes: "نعم",
    no: "لا",
    empty_users: "لا يوجد مستخدمون",
    empty_rides: "لا توجد رحلات",
    empty_reports: "لا بلاغات",
    empty_tx: "لا معاملات",
    empty_audit: "لا يوجد سجل بعد",
    badge_blocked: "محظور",
    badge_driver_pending: "طلب سائق",
    badge_driver_rejected: "سائق مرفوض",
    badge_driver_approved: "سائق مقبول",
    badge_pending_verify: "قيد الموافقة",
    badge_verified: "موثّق",
    driver_app_title: "طلب سائق",
    section_personal: "بيانات شخصية",
    section_vehicle: "المركبة",
    section_license: "رخصة القيادة",
    section_payout: "معلومات الدفع",
    section_documents: "المستندات",
    doc_car_image: "صورة السيارة",
    doc_registration: "وثيقة التسجيل",
    doc_insurance: "وثيقة التأمين",
    doc_license: "صورة الرخصة",
    doc_criminal_front: "فيشة جنائية (أمامي)",
    doc_criminal_back: "فيشة جنائية (خلفي)",
    label_car: "السيارة",
    label_color: "اللون",
    label_plate: "اللوحة",
    label_seats: "المقاعد",
    label_type: "النوع",
    label_license_number: "رقم الرخصة",
    label_license_expiry: "تاريخ الانتهاء",
    label_bank: "البنك",
    label_account: "رقم الحساب",
    label_holder: "صاحب الحساب",
    action_verify: "توثيق",
    action_approve_driver: "قبول سائق",
    action_reject_driver: "رفض سائق",
    action_view_app: "عرض الطلب",
    action_unblock: "إلغاء حظر",
    action_block: "حظر",
    action_delete: "حذف",
    aria_report_status: "حالة البلاغ",
    toast_report_updated: "تم تحديث البلاغ",
    toast_tx_flagged: "تم التعليم",
    toast_tx_unflagged: "تمت إزالة العلامة",
    toast_verify: "تم التوثيق",
    toast_approve: "تمت الموافقة",
    toast_reject: "تم الرفض",
    toast_block: "تم الحظر",
    toast_unblock: "تم إلغاء الحظر",
    toast_delete: "تم الحذف",
    confirm_approve_driver_title: "قبول طلب السائق؟",
    confirm_approve_driver_msg:
      "سيتم اعتماد طلب السائق (المستخدم يختار وضع السائق من داخل التطبيق).",
    confirm_reject_driver_title: "رفض طلب السائق؟",
    confirm_reject_driver_msg: "سيتم رفض الطلب وإضافة ملاحظة للمستخدم (اختياري).",
    prompt_reject_reason: "سبب الرفض (اختياري):",
    confirm_block_title: "حظر المستخدم؟",
    confirm_block_msg: "قرار: حظر (Block). سيتم حظر الحساب وفق إعدادات الخادم.",
    confirm_delete_title: "حذف الحساب نهائياً؟",
    confirm_delete_msg: "قرار: حذف (Delete). لا يمكن التراجع. تأكد قبل المتابعة.",
    err_not_authorized_admin: "هذا الحساب غير مصرّح له بلوحة الإدارة.",
    err_email_not_allowed: "البريد غير مسموح كمسؤول ثابت.",
    err_login_failed: "فشل تسجيل الدخول",
    db_status_atlas: "MongoDB Atlas — التغييرات تُحفظ وتظهر في Atlas",
    db_status_local: "MongoDB محلي — التغييرات تُحفظ على القرص",
    db_status_memory: "MongoDB مؤقت (ذاكرة) — التغييرات حقيقية لكن لا تظهر في Atlas وتُمسح عند إعادة تشغيل السيرفر",
    db_status_users: "المستخدمون في القاعدة: {{count}}",
    block_reason_admin: "محظور من الإدارة (ويب)",
    tx_flag_note_web: "تعليم من لوحة الويب",
    rs_open: "مفتوح",
    rs_reviewing: "قيد المراجعة",
    rs_resolved: "مُغلق",
    rs_dismissed: "مرفوض",
    tx_deposit: "إيداع",
    tx_withdraw: "سحب",
    tx_ride_payment: "دفع رحلة",
    tx_ride_charge: "خصم رحلة",
    tx_adjustment: "تسوية",
    action_tx_flag: "تعليم",
    action_tx_unflag: "إزالة العلامة",
    lang_ar: "العربية",
    lang_en: "English",
  },
  en: {
    pageTitle: "Admin Panel — WERET",
    modal_default_title: "Confirm",
    modal_cancel: "Cancel",
    modal_ok: "Confirm",
    login_brand_title: "WERET Admin",
    login_brand_sub: "Same app API — unified permissions",
    login_heading: "Sign in",
    login_secure_note: "Fixed admins only (server-validated).",
    label_api: "Server URL (API)",
    ph_api: "Empty = same origin (/admin-ui/)",
    label_email: "Email",
    label_password: "Password",
    btn_login: "Sign in",
    nav_brand_sub: "Admin panel",
    nav_panel_tag: "ADMIN PANEL",
    nav_group_main: "Main",
    nav_group_ops: "Operations",
    nav_group_insights: "Insights",
    nav_role_admin: "Super Admin",
    nav_overview: "Dashboard",
    nav_users: "Users",
    nav_rides: "Rides",
    nav_reports: "Reports",
    nav_tx: "Transactions",
    nav_audit: "Decision log",
    btn_logout: "Log out",
    ph_search: "Search current table…",
    btn_refresh: "Refresh",
    page_prev: "Previous",
    page_next: "Next",
    page_of: "Page {page} of {totalPages}",
    page_range: "Showing {from}–{to} of {total}",
    sec_overview: "Dashboard",
    page_eyebrow: "WERET",
    hero_overview_sub: "Platform overview — users, rides, and live activity.",
    hero_users_sub: "Manage passenger and driver accounts — verify, block, approve.",
    hero_rides_sub: "Track rides and lifecycle from request to completion.",
    hero_reports_sub: "Review user reports and update their status.",
    hero_tx_sub: "Monitor wallet transactions and flag suspicious activity.",
    hero_audit_sub: "Admin decision log for review and accountability.",
    sec_users: "Users",
    sec_rides: "Rides",
    sec_reports: "Reports",
    sec_tx: "Transactions",
    sec_audit: "Decision log",
    th_name: "Name",
    th_email: "Email",
    th_role: "Role",
    th_status: "Status",
    th_online: "Online",
    th_vehicle: "Vehicle",
    th_actions: "Actions",
    th_ride_status: "Status",
    th_passenger: "Passenger",
    th_driver: "Driver",
    th_fare: "Fare",
    th_date: "Date",
    th_reason: "Reason",
    th_reporter_target: "Reporter → subject",
    th_description: "Description",
    th_update_status: "Update status",
    th_user: "User",
    th_type: "Type",
    th_amount: "Amount",
    tx_status_hdr: "Status",
    th_flagged: "Flag",
    th_single_action: "Action",
    th_time: "Time",
    th_decision: "Decision",
    th_admin: "Admin",
    th_target: "Target",
    th_summary: "Summary",
    confirm_type_prompt: 'Type "{phrase}" to confirm:',
    stats_users: "Users",
    stats_rides: "Rides",
    stats_drivers_online: "Drivers online",
    stats_active_rides: "Active rides",
    stats_avg_rating: "Avg rating",
    stats_total_ratings: "Total ratings",
    stats_open_reports: "Open reports",
    stats_completed_rides: "Completed rides",
    stats_pending_drivers: "Driver applications",
    stats_flagged_tx: "Flagged transactions",
    stats_total_drivers: "Approved drivers",
    dash_live_title: "Live command center",
    dash_live_sub: "{online} drivers online · {active} active rides · {reports} open reports",
    dash_updated: "Updated {time}",
    dash_rides_breakdown: "Ride breakdown",
    dash_quick_actions: "Quick actions",
    dash_recent_activity: "Recent activity",
    dash_no_activity: "No activity yet — rides and admin decisions will appear here.",
    dash_action_users: "Users",
    dash_action_rides: "Rides",
    dash_action_reports: "Reports",
    dash_action_tx: "Transactions",
    dash_action_audit: "Decision log",
    dash_action_pending: "Driver applications",
    ride_status_pending: "Pending",
    ride_status_accepted: "Accepted",
    ride_status_ongoing: "Ongoing",
    ride_status_completed: "Completed",
    ride_status_cancelled: "Cancelled",
    activity_ride: "Ride {status} — {passenger}",
    activity_audit: "{actor}: {summary}",
    th_rating: "Rating",
    th_review: "Review",
    th_report_date: "Date",
    stats_rides_prefix: "Rides:",
    yes: "Yes",
    no: "No",
    empty_users: "No users",
    empty_rides: "No rides",
    empty_reports: "No reports",
    empty_tx: "No transactions",
    empty_audit: "No entries yet",
    badge_blocked: "Blocked",
    badge_driver_pending: "Driver application",
    badge_driver_rejected: "Driver rejected",
    badge_driver_approved: "Driver approved",
    badge_pending_verify: "Pending approval",
    badge_verified: "Verified",
    driver_app_title: "Driver Application",
    section_personal: "Personal Info",
    section_vehicle: "Vehicle",
    section_license: "Driving License",
    section_payout: "Payout Info",
    section_documents: "Documents",
    doc_car_image: "Car Image",
    doc_registration: "Registration",
    doc_insurance: "Insurance",
    doc_license: "License Image",
    doc_criminal_front: "Criminal Record (Front)",
    doc_criminal_back: "Criminal Record (Back)",
    label_car: "Car",
    label_color: "Color",
    label_plate: "Plate",
    label_seats: "Seats",
    label_type: "Type",
    label_license_number: "License Number",
    label_license_expiry: "Expiry Date",
    label_bank: "Bank",
    label_account: "Account",
    label_holder: "Holder",
    action_verify: "Verify",
    action_approve_driver: "Approve driver",
    action_reject_driver: "Reject driver",
    action_view_app: "View application",
    action_unblock: "Unblock",
    action_block: "Block",
    action_delete: "Delete",
    aria_report_status: "Report status",
    toast_report_updated: "Report updated",
    toast_tx_flagged: "Flagged",
    toast_tx_unflagged: "Flag removed",
    toast_verify: "Verified",
    toast_approve: "Approved",
    toast_reject: "Rejected",
    toast_block: "Blocked",
    toast_unblock: "Unblocked",
    toast_delete: "Deleted",
    confirm_approve_driver_title: "Approve driver application?",
    confirm_approve_driver_msg:
      "The application will be approved (the user can switch to driver mode in the app).",
    confirm_reject_driver_title: "Reject driver application?",
    confirm_reject_driver_msg: "The request will be rejected; you can add an optional note for the user.",
    prompt_reject_reason: "Rejection reason (optional):",
    confirm_block_title: "Block this user?",
    confirm_block_msg: "Action: Block. The account will be blocked per server rules.",
    confirm_delete_title: "Delete account permanently?",
    confirm_delete_msg: "Action: Delete. This cannot be undone. Proceed with care.",
    err_not_authorized_admin: "This account is not allowed to use the admin panel.",
    err_email_not_allowed: "This email is not a fixed admin account.",
    err_login_failed: "Sign-in failed",
    db_status_atlas: "MongoDB Atlas — changes persist and appear in Atlas",
    db_status_local: "Local MongoDB — changes persist on disk",
    db_status_memory: "In-memory MongoDB — changes are real but NOT in Atlas UI and reset when the server restarts",
    db_status_users: "Users in database: {{count}}",
    block_reason_admin: "Blocked from admin (web)",
    tx_flag_note_web: "Flagged from web admin",
    rs_open: "Open",
    rs_reviewing: "Reviewing",
    rs_resolved: "Resolved",
    rs_dismissed: "Dismissed",
    tx_deposit: "Deposit",
    tx_withdraw: "Withdrawal",
    tx_ride_payment: "Ride payment",
    tx_ride_charge: "Ride charge",
    tx_adjustment: "Adjustment",
    action_tx_flag: "Flag",
    action_tx_unflag: "Remove flag",
    lang_ar: "العربية",
    lang_en: "English",
  },
};

function t(key, vars) {
  let s = STR[lang]?.[key];
  if (s == null) s = STR.ar[key];
  if (s == null) s = key;
  if (vars && typeof s === "string") {
    for (const vk of Object.keys(vars)) {
      s = s.split(`{${vk}}`).join(String(vars[vk]));
    }
  }
  return s;
}

function localeForDates() {
  return lang === "ar" ? "ar-SA" : "en-US";
}

function txLabel(typ) {
  const m = {
    deposit: "tx_deposit",
    withdraw: "tx_withdraw",
    ride_payment: "tx_ride_payment",
    ride_charge: "tx_ride_charge",
    adjustment: "tx_adjustment",
  };
  const k = m[String(typ)];
  return k ? t(k) : String(typ ?? "—");
}

function reportStatusLabel(st) {
  const m = { open: "rs_open", reviewing: "rs_reviewing", resolved: "rs_resolved", dismissed: "rs_dismissed" };
  const k = m[String(st)];
  return k ? t(k) : String(st ?? "—");
}

function rpSep() {
  return lang === "ar" ? " ← " : " → ";
}

function refreshLangButtons() {
  document.querySelectorAll("[data-set-lang]").forEach((btn) => {
    const v = btn.getAttribute("data-set-lang");
    btn.classList.toggle("active", (v === "en" && lang === "en") || (v === "ar" && lang === "ar"));
  });
}

function applyStaticI18n() {
  document.documentElement.lang = lang === "ar" ? "ar" : "en";
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = t("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const k = el.getAttribute("data-i18n-placeholder");
    if (k && "placeholder" in el) el.placeholder = t(k);
  });
  refreshLangButtons();
}

function bindLangButtons() {
  document.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.getAttribute("data-set-lang") === "en" ? "en" : "ar"));
  });
}

function setLang(next) {
  lang = next === "en" ? "en" : "ar";
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
  applyStaticI18n();
  if ($("app-login") && !$("app-login").classList.contains("hidden")) {
    refreshGoogleSignInButton();
  }
  setSection(currentSection);
  const dash = $("app-dash");
  if (dash && !dash.classList.contains("hidden") && token()) {
    loadAll().catch(() => {});
  }
}

let adminSessionUser = null;
let currentSection = "overview";

const PAGE_SIZE = 7;
/** @type {Record<string, { page: number, totalPages: number }>} */
const pagers = {
  users: { page: 1, totalPages: 1 },
  rides: { page: 1, totalPages: 1 },
  reports: { page: 1, totalPages: 1 },
  tx: { page: 1, totalPages: 1 },
  audit: { page: 1, totalPages: 1 },
};

function listQueryParams(page) {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  const q = ($("global-search")?.value || "").trim();
  if (q) params.set("search", q);
  return params.toString();
}

function renderPagination(barId, pagination, sectionKey) {
  const bar = $(barId);
  if (!bar || !pagination) return;
  const { page, totalPages, total, limit } = pagination;
  pagers[sectionKey].page = page;
  pagers[sectionKey].totalPages = totalPages;

  if (total === 0) {
    bar.classList.add("hidden");
    bar.innerHTML = "";
    return;
  }

  bar.classList.remove("hidden");
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  bar.innerHTML = `
    <div class="pagination-info">${esc(t("page_range", { from, to, total }))}</div>
    <div class="pagination-controls">
      <button type="button" class="secondary btn-compact" data-pg="prev" ${page <= 1 ? "disabled" : ""}>${esc(t("page_prev"))}</button>
      <span class="pagination-pages">${esc(t("page_of", { page, totalPages }))}</span>
      <button type="button" class="secondary btn-compact" data-pg="next" ${page >= totalPages ? "disabled" : ""}>${esc(t("page_next"))}</button>
    </div>
  `;
}

function reloadPagedSection(sectionKey) {
  if (sectionKey === "users") return loadUsers();
  if (sectionKey === "rides") return loadRides();
  if (sectionKey === "reports") return loadReports();
  if (sectionKey === "tx") return loadTransactions();
  if (sectionKey === "audit") return loadAudit();
  return Promise.resolve();
}

function bindPaginationBars() {
  document.querySelectorAll("[data-pager]").forEach((bar) => {
    if (bar.dataset.bound) return;
    bar.dataset.bound = "1";
    bar.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-pg]");
      if (!btn || btn.disabled) return;
      const key = bar.getAttribute("data-pager");
      const pg = pagers[key];
      if (!pg) return;
      if (btn.getAttribute("data-pg") === "prev") pg.page = Math.max(1, pg.page - 1);
      else pg.page = Math.min(pg.totalPages || 1, pg.page + 1);
      await reloadPagedSection(key);
    });
  });
}

let searchDebounce = null;
function scheduleSearchReload() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const key = currentSection;
    if (!pagers[key]) return;
    pagers[key].page = 1;
    void reloadPagedSection(key);
  }, 320);
}
let confirmResolver = null;

function $(id) {
  return document.getElementById(id);
}

function normalizeEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

function isFixedAdminEmail(email) {
  return FIXED_ADMIN_EMAILS.includes(normalizeEmail(email));
}

function token() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(t) {
  if (t) sessionStorage.setItem(TOKEN_KEY, t);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function defaultApiBase() {
  try {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin.replace(/\/$/, "");
    }
  } catch {}
  return "";
}

function getApiBase() {
  const el = $("api-base");
  const fromInput = el?.value?.trim();
  if (fromInput) return fromInput.replace(/\/$/, "");
  const stored = (localStorage.getItem(API_BASE_KEY) || "").trim();
  if (stored) return stored.replace(/\/$/, "");
  return defaultApiBase();
}

function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBase();
  if (!base) return p;
  return `${base}${p}`;
}

function initApiBaseField() {
  const el = $("api-base");
  if (!el) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("api");
    if (q) {
      const v = q.trim().replace(/\/$/, "");
      el.value = v;
      localStorage.setItem(API_BASE_KEY, v);
      return;
    }
  } catch {}
  el.value = localStorage.getItem(API_BASE_KEY) || defaultApiBase();
  el.addEventListener("change", () => {
    refreshGoogleSignInButton();
  });
}

function persistApiBase() {
  const el = $("api-base");
  if (!el) return;
  const v = el.value.trim().replace(/\/$/, "");
  if (v) localStorage.setItem(API_BASE_KEY, v);
  else localStorage.removeItem(API_BASE_KEY);
}

async function apiJson(path, options = {}) {
  const headers = { Accept: "application/json", ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const auth = token();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const res = await fetch(apiUrl(path), { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || res.statusText };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

async function refreshGoogleSignInButton() {
  const wrap = $("google-signin-wrap");
  const host = $("google-signin-btn");
  if (!wrap || !host) return;
  host.innerHTML = "";
  wrap.classList.add("hidden");
  try {
    const res = await fetch(apiUrl("/auth/google-config"), { headers: { Accept: "application/json" } });
    if (!res.ok) return;
    const cfg = await res.json();
    if (!cfg.enabled || !cfg.webClientId) return;
    wrap.classList.remove("hidden");
    const run = () => {
      if (!globalThis.google?.accounts?.id) return;
      try {
        globalThis.google.accounts.id.initialize({
          client_id: cfg.webClientId,
          callback: onGoogleCredential,
          auto_select: false,
        });
        globalThis.google.accounts.id.renderButton(host, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
          locale: lang === "ar" ? "ar" : "en",
        });
      } catch {
        wrap.classList.add("hidden");
      }
    };
    if (globalThis.google?.accounts?.id) run();
    else {
      let n = 0;
      const timer = setInterval(() => {
        n += 1;
        if (globalThis.google?.accounts?.id) {
          clearInterval(timer);
          run();
        } else if (n > 120) clearInterval(timer);
      }, 50);
    }
  } catch {
    wrap.classList.add("hidden");
  }
}

async function onGoogleCredential(resp) {
  const idToken = resp?.credential;
  if (!idToken) return;
  $("login-error")?.classList.add("hidden");
  try {
    const data = await apiJson("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    if (!assertAdminSession(data.user)) return;
    setToken(data.token || data.accessToken);
    persistApiBase();
    showDashboard(data.user);
    setSection("overview");
    bindUsersTableActions();
    await loadAll();
  } catch (e) {
    const el = $("login-error");
    if (el) {
      el.textContent = e.message || t("err_login_failed");
      el.classList.remove("hidden");
    }
  }
}

function esc(s) {
  if (s == null || s === "") return "—";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(message, kind = "info") {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden", "toast-success", "toast-error");
  el.classList.add(kind === "success" ? "toast-success" : kind === "error" ? "toast-error" : "");
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.classList.add("hidden"), 400);
  }, 2600);
}

function openConfirm({ title, message, danger = true }) {
  $("modal-confirm-title").textContent = title;
  $("modal-confirm-msg").textContent = message;
  const ok = $("modal-confirm-ok");
  ok.classList.toggle("btn-danger", danger);
  ok.classList.toggle("btn-success", !danger);
  $("modal-confirm").classList.remove("hidden");
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

async function openConfirmTyped({ title, message, phrase }) {
  const ok = await openConfirm({ title, message, danger: true });
  if (!ok) return false;
  const typed = window.prompt(t("confirm_type_prompt", { phrase }), "") || "";
  return typed.trim() === String(phrase);
}

function closeConfirm(result) {
  $("modal-confirm").classList.add("hidden");
  const fn = confirmResolver;
  confirmResolver = null;
  if (fn) fn(result);
}

$("modal-confirm-cancel")?.addEventListener("click", () => closeConfirm(false));
$("modal-confirm-ok")?.addEventListener("click", () => closeConfirm(true));
$("modal-confirm")?.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-backdrop")) closeConfirm(false);
});

/** Same as mobile — PATCH /admin/users/:userId */
async function patchUserSafe(userId, body) {
  await apiJson(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

async function deleteUserSafe(userId) {
  await apiJson(`/admin/users/${userId}`, { method: "DELETE" });
}

let _driverAppUserId = null;

function openDriverAppModal(userId) {
  _driverAppUserId = userId;
  const modal = $("modal-driver-app");
  const body = $("driver-app-body");
  const actions = $("driver-app-actions");
  modal.classList.remove("hidden");
  body.innerHTML = `<div class="driver-app-skeleton">${esc(t("loading"))}…</div>`;
  actions.classList.add("hidden");
  fetchDriverApp(userId);
}

function closeDriverAppModal() {
  _driverAppUserId = null;
  $("modal-driver-app")?.classList.add("hidden");
}

async function fetchDriverApp(userId) {
  try {
    const data = await apiJson(`/admin/users/${userId}/profile`);
    renderDriverApp(data);
  } catch (e) {
    $("driver-app-body").innerHTML = `<p class="err">${esc(e.message)}</p>`;
  }
}

function renderDriverApp(data) {
  const body = $("driver-app-body");
  const actions = $("driver-app-actions");
  const { user, profile, documents } = data;
  const sections = [];

  sections.push(`
    <div class="driver-app-section">
      <h4>${esc(t("section_personal"))}</h4>
      <div class="field-row">
        <span class="label">${esc(t("label_name"))}</span>
        <span class="value">${esc(user.name || "—")}</span>
        <span class="label">${esc(t("label_email"))}</span>
        <span class="value">${esc(user.email || "—")}</span>
        <span class="label">${esc(t("label_phone"))}</span>
        <span class="value">${esc(user.phone || "—")}</span>
      </div>
    </div>
  `);

  if (profile) {
    sections.push(`
      <div class="driver-app-section">
        <h4>${esc(t("section_vehicle"))}</h4>
        ${(profile.cars || []).map((c, i) => `
          <div style="margin-bottom:0.5rem;${i > 0 ? 'border-top:1px solid var(--border-subtle);padding-top:0.5rem;margin-top:0.5rem' : ''}">
            <div class="field-row">
              <span class="label">${esc(t("label_car"))}</span>
              <span class="value">${esc(c.brand || "—")} ${esc(c.model || "—")} (${esc(c.year || "—")})</span>
              <span class="label">${esc(t("label_color"))}</span>
              <span class="value">${esc(c.color || "—")}</span>
              <span class="label">${esc(t("label_plate"))}</span>
              <span class="value">${esc(c.plateNumber || "—")}</span>
              <span class="label">${esc(t("label_seats"))}</span>
              <span class="value">${c.seats || "—"}</span>
              <span class="label">${esc(t("label_type"))}</span>
              <span class="value">${esc(c.carCategory || "—")}</span>
            </div>
            <div class="doc-grid">
              ${c.imageUrl ? `<a href="${esc(c.imageUrl)}" target="_blank" rel="noopener">📷 ${esc(t("doc_car_image"))}</a>` : ""}
              ${c.registrationDocUrl ? `<a href="${esc(c.registrationDocUrl)}" target="_blank" rel="noopener">📄 ${esc(t("doc_registration"))}</a>` : ""}
              ${c.insuranceDocUrl ? `<a href="${esc(c.insuranceDocUrl)}" target="_blank" rel="noopener">📄 ${esc(t("doc_insurance"))}</a>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `);

    sections.push(`
      <div class="driver-app-section">
        <h4>${esc(t("section_license"))}</h4>
        <div class="field-row">
          <span class="label">${esc(t("label_license_number"))}</span>
          <span class="value">${esc(profile.licenseNumber || "—")}</span>
          <span class="label">${esc(t("label_license_expiry"))}</span>
          <span class="value">${profile.licenseExpiry ? new Date(profile.licenseExpiry).toLocaleDateString(localeForDates()) : "—"}</span>
        </div>
        <div class="doc-grid">
          ${profile.licenseImageUrl ? `<a href="${esc(profile.licenseImageUrl)}" target="_blank" rel="noopener">📷 ${esc(t("doc_license"))}</a>` : ""}
        </div>
      </div>
    `);

    if (profile.payoutBankName || profile.payoutAccountNumber) {
      sections.push(`
        <div class="driver-app-section">
          <h4>${esc(t("section_payout"))}</h4>
          <div class="field-row">
            <span class="label">${esc(t("label_bank"))}</span>
            <span class="value">${esc(profile.payoutBankName || "—")}</span>
            <span class="label">${esc(t("label_account"))}</span>
            <span class="value">${esc(profile.payoutAccountNumber || "—")}</span>
            <span class="label">${esc(t("label_holder"))}</span>
            <span class="value">${esc(profile.payoutAccountHolder || "—")}</span>
          </div>
        </div>
      `);
    }
  }

  if (documents) {
    const docLinks = [];
    if (documents.criminalRecordFrontUrl) docLinks.push(`<a href="${esc(documents.criminalRecordFrontUrl)}" target="_blank" rel="noopener">📷 ${esc(t("doc_criminal_front"))}</a>`);
    if (documents.criminalRecordBackUrl) docLinks.push(`<a href="${esc(documents.criminalRecordBackUrl)}" target="_blank" rel="noopener">📷 ${esc(t("doc_criminal_back"))}</a>`);
    if (docLinks.length) {
      sections.push(`
        <div class="driver-app-section">
          <h4>${esc(t("section_documents"))}</h4>
          <div class="doc-grid">${docLinks.join("")}</div>
        </div>
      `);
    }
  }

  body.innerHTML = sections.join("");
  actions.classList.remove("hidden");
}

$("driver-app-close")?.addEventListener("click", closeDriverAppModal);
$("modal-driver-app")?.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-backdrop")) closeDriverAppModal();
});

$("driver-app-approve")?.addEventListener("click", async () => {
  const id = _driverAppUserId;
  if (!id) return;
  const ok = await openConfirm({
    title: t("confirm_approve_driver_title"),
    message: t("confirm_approve_driver_msg"),
    danger: false,
  });
  if (!ok) return;
  await patchUserSafe(id, {
    driver_application_status: "approved",
    driver_profile_status: "approved",
    driver_review_note: "",
  });
  closeDriverAppModal();
  toast(t("toast_approve"), "success");
  await loadUsers();
});

$("driver-app-reject")?.addEventListener("click", async () => {
  const id = _driverAppUserId;
  if (!id) return;
  const ok = await openConfirm({
    title: t("confirm_reject_driver_title"),
    message: t("confirm_reject_driver_msg"),
    danger: true,
  });
  if (!ok) return;
  const note = window.prompt(t("prompt_reject_reason"), "") || "";
  await patchUserSafe(id, {
    driver_application_status: "rejected",
    driver_profile_status: "rejected",
    driver_review_note: note,
  });
  closeDriverAppModal();
  toast(t("toast_reject"), "success");
  await loadUsers();
});

async function patchReport(id, status) {
  await apiJson(`/admin/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

async function patchTxFlag(id, flagged, flaggedReason) {
  await apiJson(`/admin/transactions/${id}/flag`, {
    method: "PATCH",
    body: JSON.stringify({ flagged, flaggedReason: flaggedReason || "" }),
  });
}

function showLogin() {
  $("app-login").classList.remove("hidden");
  $("app-dash").classList.add("hidden");
  refreshGoogleSignInButton();
}

function showDashboard(user) {
  adminSessionUser = user;
  $("app-login").classList.add("hidden");
  $("app-dash").classList.remove("hidden");
  const pill = $("profile-pill");
  if (pill) pill.textContent = user?.email || "";
  const who = $("whoami");
  if (who) who.textContent = user?.email || "";
  const nameEl = $("sidebar-user-name");
  if (nameEl) nameEl.textContent = user?.name || user?.email || "Admin";
  const avatar = $("sidebar-avatar");
  if (avatar) {
    const n = (user?.name || user?.email || "A").trim();
    avatar.textContent = n ? n[0].toUpperCase() : "A";
  }

}

const SECTION_META = {
  overview: { titleKey: "sec_overview", subtitleKey: "hero_overview_sub" },
  users: { titleKey: "sec_users", subtitleKey: "hero_users_sub" },
  rides: { titleKey: "sec_rides", subtitleKey: "hero_rides_sub" },
  reports: { titleKey: "sec_reports", subtitleKey: "hero_reports_sub" },
  tx: { titleKey: "sec_tx", subtitleKey: "hero_tx_sub" },
  audit: { titleKey: "sec_audit", subtitleKey: "hero_audit_sub" },
};

function setCountBadge(id, total) {
  const el = $(id);
  if (el) el.textContent = String(total ?? 0);
}

function setSection(name) {
  currentSection = name;
  const meta = SECTION_META[name] || SECTION_META.overview;
  const title = t(meta.titleKey);
  const subtitle = t(meta.subtitleKey);
  const crumb = $("breadcrumb-current");
  if (crumb) crumb.textContent = title;
  const pageTitle = $("page-title");
  if (pageTitle) pageTitle.textContent = title;
  const pageSub = $("page-subtitle");
  if (pageSub) pageSub.textContent = subtitle;
  document.querySelectorAll(".section-panel").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  const panel = $(`section-${name === "overview" ? "overview" : name}`);
  if (panel) panel.classList.remove("hidden");
  const navBtn = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (navBtn) navBtn.classList.add("active");
  const hero = document.querySelector(".page-hero");
  if (hero) hero.classList.toggle("hidden", false);
}

function rideStatusLabel(status) {
  const key = `ride_status_${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

function setDashboardLoading(show) {
  const ids = ["dashboard-command", "stats-grid", "stats-secondary", "dashboard-insights"];
  const sk = $("stats-skeleton");
  if (show) {
    ids.forEach((id) => $(id)?.classList.add("hidden"));
    if (sk) {
      sk.classList.remove("hidden");
      sk.innerHTML = Array(4)
        .fill(0)
        .map(() => `<div class="skeleton-card skeleton-card--hero"></div>`)
        .join("");
    }
  } else {
    sk?.classList.add("hidden");
    $("dashboard-command")?.classList.remove("hidden");
    $("stats-grid")?.classList.remove("hidden");
    $("stats-secondary")?.classList.remove("hidden");
    $("dashboard-insights")?.classList.remove("hidden");
  }
}

function renderKpiCard({ lbl, num, icon, tone, hero, alert }) {
  const cls = ["kpi-card", hero ? "kpi-card--hero" : "", alert ? "kpi-card--alert" : ""].filter(Boolean).join(" ");
  return `<article class="${cls}"><div class="kpi-icon kpi-icon--${esc(tone)}">${icon}</div><div><div class="kpi-num">${esc(num)}</div><div class="kpi-lbl">${esc(lbl)}</div></div></article>`;
}

function renderStatusChart(by) {
  const order = ["pending", "accepted", "ongoing", "completed", "cancelled"];
  const colors = {
    pending: "#f59e0b",
    accepted: "#3b82f6",
    ongoing: "#22c55e",
    completed: "#64748b",
    cancelled: "#ef4444",
  };
  const keys = [...new Set([...order, ...Object.keys(by || {})])].filter((k) => by?.[k]);
  const total = keys.reduce((s, k) => s + (by[k] || 0), 0);
  if (!total) {
    return `<p class="insight-empty">${esc(t("empty_rides"))}</p>`;
  }
  return keys
    .map((k) => {
      const n = by[k] || 0;
      const pct = Math.round((n / total) * 100);
      const color = colors[k] || "#94a3b8";
      return `<div class="status-bar-row">
        <div class="status-bar-meta"><span class="status-bar-label">${esc(rideStatusLabel(k))}</span><strong class="status-bar-count">${esc(n)}</strong></div>
        <div class="status-bar-track"><div class="status-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
    })
    .join("");
}

function renderQuickActions(stats) {
  const actions = [
    { sec: "users", icon: "👥", lbl: t("dash_action_users"), badge: stats.pendingDrivers },
    { sec: "rides", icon: "🚕", lbl: t("dash_action_rides"), badge: stats.activeRides },
    { sec: "reports", icon: "🚩", lbl: t("dash_action_reports"), badge: stats.openReports },
    { sec: "tx", icon: "💳", lbl: t("dash_action_tx"), badge: stats.flaggedTx },
    { sec: "audit", icon: "📋", lbl: t("dash_action_audit") },
  ];
  return actions
    .map(({ sec, icon, lbl, badge }) => {
      const badgeHtml =
        badge > 0 ? `<span class="quick-nav-badge">${esc(badge > 99 ? "99+" : badge)}</span>` : "";
      return `<button type="button" class="quick-nav-btn" data-goto="${esc(sec)}"><span class="quick-nav-icon">${icon}</span><span>${esc(lbl)}</span>${badgeHtml}</button>`;
    })
    .join("");
}

function buildActivityItems(stats) {
  const items = [];
  for (const r of stats.recentRides || []) {
    items.push({
      ts: r.createdAt,
      icon: "🚕",
      text: t("activity_ride", {
        status: rideStatusLabel(r.status),
        passenger: r.passenger || r.driver || "—",
      }),
    });
  }
  for (const l of stats.recentActivity || []) {
    items.push({
      ts: l.createdAt,
      icon: "📋",
      text: t("activity_audit", { actor: l.actor || "Admin", summary: l.summary || l.action || "—" }),
    });
  }
  return items.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 10);
}

function renderActivityFeed(stats) {
  const items = buildActivityItems(stats);
  if (!items.length) {
    return `<p class="insight-empty">${esc(t("dash_no_activity"))}</p>`;
  }
  return items
    .map(
      (it) => `<div class="activity-item">
        <span class="activity-icon">${it.icon}</span>
        <div class="activity-body">
          <p class="activity-text">${esc(it.text)}</p>
          <time class="activity-time mono">${esc(it.ts ? new Date(it.ts).toLocaleString(localeForDates()) : "—")}</time>
        </div>
      </div>`
    )
    .join("");
}

function bindQuickActions() {
  const host = $("quick-actions");
  if (!host || host.dataset.bound) return;
  host.dataset.bound = "1";
  host.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-goto]");
    if (!btn) return;
    const sec = btn.getAttribute("data-goto");
    setSection(sec);
    if (sec === "users") loadUsers();
    if (sec === "rides") loadRides();
    if (sec === "reports") loadReports();
    if (sec === "tx") loadTransactions();
    if (sec === "audit") loadAudit();
  });
}

function skeletonStats(show) {
  setDashboardLoading(show);
}

function renderDbStatusBanner(stats) {
  const el = $("db-status-banner");
  const db = stats?.database;
  if (!el || !db) return;
  const mode = db.mode || "off";
  const users = db.collections?.users ?? stats.totalUsers ?? "—";
  const key =
    mode === "atlas" ? "db_status_atlas" : mode === "local" ? "db_status_local" : mode === "memory" ? "db_status_memory" : null;
  if (!key) {
    el.classList.add("hidden");
    return;
  }
  el.className = `db-status-banner db-status-${mode}`;
  el.innerHTML = `<strong>${esc(t(key))}</strong><span class="db-status-meta">${esc(t("db_status_users", { count: users }))}</span>`;
  el.classList.remove("hidden");
}

async function loadStats() {
  $("stats-error").classList.add("hidden");
  skeletonStats(true);
  try {
    const { stats } = await apiJson("/admin/stats");
    skeletonStats(false);

    const heroItems = [
      { lbl: t("stats_users"), num: stats.totalUsers, icon: "👥", tone: "brand", hero: true },
      { lbl: t("stats_rides"), num: stats.totalRides, icon: "🚕", tone: "brand", hero: true },
      { lbl: t("stats_drivers_online"), num: stats.driversOnline, icon: "📡", tone: "green", hero: true },
      { lbl: t("stats_active_rides"), num: stats.activeRides, icon: "⚡", tone: "green", hero: true },
    ];
    const secondaryItems = [
      { lbl: t("stats_completed_rides"), num: stats.completedRides ?? 0, icon: "✅", tone: "gray" },
      { lbl: t("stats_avg_rating"), num: stats.averageRating ?? "—", icon: "⭐", tone: "brand" },
      { lbl: t("stats_total_ratings"), num: stats.totalRatings ?? 0, icon: "💬", tone: "brand" },
      {
        lbl: t("stats_open_reports"),
        num: stats.openReports ?? 0,
        icon: "🚩",
        tone: "green",
        alert: (stats.openReports ?? 0) > 0,
      },
      {
        lbl: t("stats_pending_drivers"),
        num: stats.pendingDrivers ?? 0,
        icon: "🪪",
        tone: "brand",
        alert: (stats.pendingDrivers ?? 0) > 0,
      },
      { lbl: t("stats_flagged_tx"), num: stats.flaggedTx ?? 0, icon: "⚠️", tone: "gray" },
      { lbl: t("stats_total_drivers"), num: stats.totalDrivers ?? 0, icon: "🧑‍✈️", tone: "green" },
    ];

    const grid = $("stats-grid");
    grid.classList.add("stagger-children");
    grid.innerHTML = heroItems.map(renderKpiCard).join("");

    const secGrid = $("stats-secondary");
    secGrid.classList.add("stagger-children");
    secGrid.innerHTML = secondaryItems.map(renderKpiCard).join("");

    const liveSub = $("dash-live-sub");
    if (liveSub) {
      liveSub.textContent = t("dash_live_sub", {
        online: stats.driversOnline ?? 0,
        active: stats.activeRides ?? 0,
        reports: stats.openReports ?? 0,
      });
    }
    const updated = $("dash-updated");
    if (updated) {
      updated.textContent = t("dash_updated", {
        time: new Date().toLocaleTimeString(localeForDates()),
      });
    }

    const chart = $("ride-status-chart");
    if (chart) chart.innerHTML = renderStatusChart(stats.ridesByStatus || {});

    const qa = $("quick-actions");
    if (qa) {
      qa.innerHTML = renderQuickActions(stats);
      bindQuickActions();
    }

    const feed = $("activity-feed");
    if (feed) feed.innerHTML = renderActivityFeed(stats);
    renderDbStatusBanner(stats);
  } catch (e) {
    skeletonStats(false);
    $("stats-error").textContent = e.message || String(e);
    $("stats-error").classList.remove("hidden");
  }
}

function skeletonTable(id, show, rows = 7) {
  const el = $(id);
  if (!el) return;
  if (show) {
    el.classList.remove("hidden");
    el.innerHTML = Array(rows)
      .fill(0)
      .map(() => `<div class="skeleton-row"></div>`)
      .join("");
  } else el.classList.add("hidden");
}

function userStatusBadge(u) {
  if (u.is_blocked) return `<span class="status-badge bad">${esc(t("badge_blocked"))}</span>`;
  if (u.driver_application_status === "pending")
    return `<span class="status-badge wait">${esc(t("badge_driver_pending"))}</span>`;
  if (u.driver_application_status === "rejected")
    return `<span class="status-badge bad">${esc(t("badge_driver_rejected"))}</span>`;
  if (u.driver_application_status === "approved")
    return `<span class="status-badge ok">${esc(t("badge_driver_approved"))}</span>`;
  if (u.is_verified === false) return `<span class="status-badge wait">${esc(t("badge_pending_verify"))}</span>`;
  return `<span class="status-badge ok">${esc(t("badge_verified"))}</span>`;
}

async function loadUsers() {
  $("users-error").classList.add("hidden");
  skeletonTable("users-skeleton", true);
  const body = $("users-body");
  body.innerHTML = "";
  try {
    const page = pagers.users.page;
    const { users, pagination } = await apiJson(`/admin/users?${listQueryParams(page)}`);
    skeletonTable("users-skeleton", false);
    renderPagination("users-pagination", pagination, "users");
    setCountBadge("users-count", pagination?.total ?? (users || []).length);
    const myId = adminSessionUser?._id;
    body.innerHTML = (users || [])
      .map((u) => {
        const danger = u.is_blocked ? " row-danger" : "";
        const fixed = isFixedAdminEmail(u.email);
        const isSelf = String(u._id) === String(myId);
        const actions = [];
        actions.push(
          `<button type="button" class="btn-inline" data-act="verify" data-id="${esc(u._id)}">${esc(t("action_verify"))}</button>`
        );
        if (u.driver_application_status === "pending") {
          actions.push(
            `<button type="button" class="btn-inline" data-act="viewApp" data-id="${esc(u._id)}">${esc(t("action_view_app"))}</button>`
          );
          actions.push(
            `<button type="button" class="btn-inline" data-act="approveDriver" data-id="${esc(u._id)}">${esc(t("action_approve_driver"))}</button>`
          );
          actions.push(
            `<button type="button" class="btn-inline danger" data-act="rejectDriver" data-id="${esc(u._id)}">${esc(t("action_reject_driver"))}</button>`
          );
        }
        if (!isSelf) {
          if (u.is_blocked) {
            actions.push(
              `<button type="button" class="btn-inline" data-act="unblock" data-id="${esc(u._id)}">${esc(t("action_unblock"))}</button>`
            );
          } else {
            actions.push(
              `<button type="button" class="btn-inline warn" data-act="block" data-id="${esc(u._id)}">${esc(t("action_block"))}</button>`
            );
          }
          if (!fixed) {
            actions.push(
              `<button type="button" class="btn-inline danger" data-act="delete" data-id="${esc(u._id)}">${esc(t("action_delete"))}</button>`
            );
          }
        }
        return `<tr class="${danger}" data-user-row="${esc(u._id)}">
            <td>${esc(u.name)}</td>
            <td class="mono">${esc(u.email)}</td>
            <td>${esc(u.role)}</td>
            <td>${userStatusBadge(u)}</td>
            <td>${u.isOnline ? esc(t("yes")) : esc(t("no"))}</td>
            <td class="mono">${esc(u.vehicleType || "—")}</td>
            <td><div class="actions-cell">${actions.join("")}</div></td>
          </tr>`;
      })
      .join("");
    if (!users?.length) body.innerHTML = `<tr><td colspan="7">${esc(t("empty_users"))}</td></tr>`;
  } catch (e) {
    skeletonTable("users-skeleton", false);
    $("users-error").textContent = e.message || String(e);
    $("users-error").classList.remove("hidden");
  }
}

async function loadRides() {
  $("rides-error").classList.add("hidden");
  skeletonTable("rides-skeleton", true);
  const body = $("rides-body");
  body.innerHTML = "";
  try {
    const page = pagers.rides.page;
    const { rides, pagination } = await apiJson(`/admin/rides?${listQueryParams(page)}`);
    skeletonTable("rides-skeleton", false);
    renderPagination("rides-pagination", pagination, "rides");
    setCountBadge("rides-count", pagination?.total ?? (rides || []).length);
    body.innerHTML = (rides || [])
      .map((r) => {
        const p = r.passengerId?.name || r.passengerId?.email || "—";
        const d = r.driverId?.name || r.driverId?.email || "—";
        const fare = r.agreedFare ?? r.estimatedFare ?? "—";
        const rating = r.passengerRating != null ? `${r.passengerRating}★` : "—";
        const review = (r.passengerReview || "").slice(0, 60) || "—";
        const dt = r.createdAt ? new Date(r.createdAt).toLocaleString(localeForDates()) : "—";
        return `<tr>
          <td>${esc(r.status)}</td>
          <td>${esc(p)}</td>
          <td>${esc(d)}</td>
          <td class="mono">${esc(fare)}</td>
          <td>${esc(rating)}</td>
          <td class="mono" style="max-width:160px">${esc(review)}</td>
          <td class="mono">${esc(dt)}</td>
        </tr>`;
      })
      .join("");
    if (!rides?.length) body.innerHTML = `<tr><td colspan="7">${esc(t("empty_rides"))}</td></tr>`;
  } catch (e) {
    skeletonTable("rides-skeleton", false);
    $("rides-error").textContent = e.message || String(e);
    $("rides-error").classList.remove("hidden");
  }
}

async function loadReports() {
  $("reports-error").classList.add("hidden");
  skeletonTable("reports-skeleton", true);
  const body = $("reports-body");
  body.innerHTML = "";
  try {
    const page = pagers.reports.page;
    const { reports, pagination } = await apiJson(`/admin/reports?${listQueryParams(page)}`);
    skeletonTable("reports-skeleton", false);
    renderPagination("reports-pagination", pagination, "reports");
    setCountBadge("reports-count", pagination?.total ?? (reports || []).length);
    body.innerHTML = (reports || [])
      .map((r) => {
        const rep = r.reporterId?.name || r.reporterId?.email || "—";
        const tgt = r.reportedUserId?.name || r.reportedUserId?.email || "—";
        const opts = ["open", "reviewing", "resolved", "dismissed"]
          .map(
            (st) =>
              `<option value="${st}" ${r.status === st ? "selected" : ""}>${esc(reportStatusLabel(st))}</option>`
          )
          .join("");
        const created = r.createdAt ? new Date(r.createdAt).toLocaleString(localeForDates()) : "—";
        return `<tr>
          <td><span class="status-badge">${esc(reportStatusLabel(r.status))}</span></td>
          <td>${esc(r.reason)}</td>
          <td>${esc(rep)}${rpSep()}${esc(tgt)}</td>
          <td class="mono" style="max-width:220px">${esc((r.description || "").slice(0, 120))}${(r.description || "").length > 120 ? "…" : ""}</td>
          <td class="mono">${esc(created)}</td>
          <td>
            <select class="select-compact" data-report-status="${esc(r._id)}" aria-label="${esc(t("aria_report_status"))}">${opts}</select>
          </td>
        </tr>`;
      })
      .join("");
    if (!reports?.length) body.innerHTML = `<tr><td colspan="6">${esc(t("empty_reports"))}</td></tr>`;

    body.querySelectorAll("select[data-report-status]").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.getAttribute("data-report-status");
        try {
          await patchReport(id, sel.value);
          toast(t("toast_report_updated"), "success");
          await loadReports();
        } catch (err) {
          toast(err.message || String(err), "error");
        }
      });
    });
  } catch (e) {
    skeletonTable("reports-skeleton", false);
    $("reports-error").textContent = e.message || String(e);
    $("reports-error").classList.remove("hidden");
  }
}

async function loadTransactions() {
  $("tx-error").classList.add("hidden");
  skeletonTable("tx-skeleton", true);
  const body = $("tx-body");
  body.innerHTML = "";
  try {
    const page = pagers.tx.page;
    const { transactions, pagination } = await apiJson(`/admin/transactions?${listQueryParams(page)}`);
    skeletonTable("tx-skeleton", false);
    renderPagination("tx-pagination", pagination, "tx");
    setCountBadge("tx-count", pagination?.total ?? (transactions || []).length);
    body.innerHTML = (transactions || [])
      .map((tx) => {
        const u = tx.userId?.name || tx.userId?.email || "—";
        const typ = txLabel(tx.type);
        const dt = tx.createdAt ? new Date(tx.createdAt).toLocaleString(localeForDates()) : "—";
        const flag = tx.flagged ? ` ${t("yes")}` : ` ${t("no")}`;
        const rowCls = tx.flagged ? " row-danger" : "";
        const flagBtn = tx.flagged
          ? `<button type="button" class="btn-inline" data-tx-unflag="${esc(tx._id)}">${esc(t("action_tx_unflag"))}</button>`
          : `<button type="button" class="btn-inline warn" data-tx-flag="${esc(tx._id)}">${esc(t("action_tx_flag"))}</button>`;
        return `<tr class="${rowCls}" data-tx-row="${esc(tx._id)}">
          <td>${esc(u)}</td>
          <td>${esc(typ)}</td>
          <td class="mono">${esc(Number(tx.amount || 0).toFixed(2))}</td>
          <td>${esc(tx.status)}</td>
          <td>${esc(flag)}</td>
          <td class="mono">${esc(dt)}</td>
          <td>${flagBtn}</td>
        </tr>`;
      })
      .join("");
    if (!transactions?.length) body.innerHTML = `<tr><td colspan="7">${esc(t("empty_tx"))}</td></tr>`;

    body.querySelectorAll("[data-tx-flag]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-tx-flag");
        try {
          await patchTxFlag(id, true, t("tx_flag_note_web"));
          toast(t("toast_tx_flagged"), "success");
          await loadTransactions();
        } catch (err) {
          toast(err.message || String(err), "error");
        }
      });
    });
    body.querySelectorAll("[data-tx-unflag]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-tx-unflag");
        try {
          await patchTxFlag(id, false, "");
          toast(t("toast_tx_unflagged"), "success");
          await loadTransactions();
        } catch (err) {
          toast(err.message || String(err), "error");
        }
      });
    });
  } catch (e) {
    skeletonTable("tx-skeleton", false);
    $("tx-error").textContent = e.message || String(e);
    $("tx-error").classList.remove("hidden");
  }
}

async function loadAudit() {
  $("audit-error")?.classList.add("hidden");
  skeletonTable("audit-skeleton", true);
  const body = $("audit-body");
  if (body) body.innerHTML = "";
  try {
    const page = pagers.audit.page;
    const { logs, pagination } = await apiJson(`/admin/audit?${listQueryParams(page)}`);
    skeletonTable("audit-skeleton", false);
    renderPagination("audit-pagination", pagination, "audit");
    setCountBadge("audit-count", pagination?.total ?? (logs || []).length);
    const rows = (logs || []).map((x) => {
      const when = x.createdAt ? new Date(x.createdAt).toLocaleString(localeForDates()) : "—";
      const act = esc(String(x.action || "—"));
      const actor = esc(x.actorAdminId?.email || "—");
      const target = `${esc(x.targetType || "—")} · <span class="mono">${esc(String(x.targetId || "").slice(-8))}</span>`;
      const sum = esc(x.summary || "");
      return `<tr>
        <td class="mono">${esc(when)}</td>
        <td>${act}</td>
        <td class="mono">${actor}</td>
        <td>${target}</td>
        <td>${sum || "—"}</td>
      </tr>`;
    });
    if (body) body.innerHTML = rows.join("") || `<tr><td colspan="5">${esc(t("empty_audit"))}</td></tr>`;
  } catch (e) {
    skeletonTable("audit-skeleton", false);
    const err = $("audit-error");
    if (err) {
      err.textContent = e.message || String(e);
      err.classList.remove("hidden");
    }
  }
}

async function loadAll() {
  await loadStats();
}

function bindUsersTableActions() {
  const body = $("users-body");
  if (!body || body.dataset.bound) return;
  body.dataset.bound = "1";
  body.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    const id = btn.getAttribute("data-id");
    const row = document.querySelector(`[data-user-row="${id}"]`);
    try {
      if (act === "verify") {
        await patchUserSafe(id, { is_verified: true });
        toast(t("toast_verify"), "success");
        await loadUsers();
        return;
      }
      if (act === "viewApp") {
        await openDriverAppModal(id);
        return;
      }
      if (act === "approveDriver") {
        const ok = await openConfirm({
          title: t("confirm_approve_driver_title"),
          message: t("confirm_approve_driver_msg"),
          danger: false,
        });
        if (!ok) return;
        await patchUserSafe(id, {
          driver_application_status: "approved",
          driver_profile_status: "approved",
          driver_review_note: "",
        });
        closeDriverAppModal();
        toast(t("toast_approve"), "success");
        await loadUsers();
        return;
      }
      if (act === "rejectDriver") {
        const ok = await openConfirm({
          title: t("confirm_reject_driver_title"),
          message: t("confirm_reject_driver_msg"),
          danger: true,
        });
        if (!ok) return;
        const note = window.prompt(t("prompt_reject_reason"), "") || "";
        await patchUserSafe(id, {
          driver_application_status: "rejected",
          driver_profile_status: "rejected",
          driver_review_note: note,
        });
        closeDriverAppModal();
        toast(t("toast_reject"), "success");
        await loadUsers();
        return;
      }
      if (act === "block") {
        const ok = await openConfirmTyped({
          title: t("confirm_block_title"),
          message: t("confirm_block_msg"),
          phrase: "BLOCK",
        });
        if (!ok) return;
        await patchUserSafe(id, { is_blocked: true, block_reason: t("block_reason_admin") });
        toast(t("toast_block"), "success");
        await loadUsers();
        return;
      }
      if (act === "unblock") {
        await patchUserSafe(id, { is_blocked: false, blocked_until: null, block_reason: "" });
        toast(t("toast_unblock"), "success");
        await loadUsers();
        return;
      }
      if (act === "delete") {
        const ok = await openConfirmTyped({
          title: t("confirm_delete_title"),
          message: t("confirm_delete_msg"),
          phrase: "DELETE",
        });
        if (!ok) return;
        if (row) {
          row.classList.add("row-out");
          await new Promise((r) => setTimeout(r, 320));
        }
        await deleteUserSafe(id);
        toast(t("toast_delete"), "success");
        await loadUsers();
      }
    } catch (err) {
      toast(err.message || String(err), "error");
      if (row) row.classList.remove("row-out");
    }
  });

  body.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-user-row]");
    if (!tr) return;
    body.querySelectorAll("tr[data-user-row]").forEach((r) => r.classList.remove("row-selected"));
    tr.classList.add("row-selected");
  });
}

function applyTableFilter() {
  if (!pagers[currentSection]) return;
  scheduleSearchReload();
}

function assertAdminSession(user) {
  if (user.role !== "admin" || !isFixedAdminEmail(user.email)) {
    setToken(null);
    $("login-error").textContent = t("err_not_authorized_admin");
    $("login-error").classList.remove("hidden");
    showLogin();
    return false;
  }
  return true;
}

async function trySession() {
  if (!token()) {
    showLogin();
    return;
  }
  try {
    const { user } = await apiJson("/auth/me");
    if (!assertAdminSession(user)) return;
    showDashboard(user);
    setSection("overview");
    bindUsersTableActions();
    bindPaginationBars();
    await loadAll();
  } catch {
    setToken(null);
    showLogin();
  }
}

const formLogin = $("form-login");
if (formLogin) {
  formLogin.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("login-error").classList.add("hidden");
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!isFixedAdminEmail(email)) {
      $("login-error").textContent = t("err_email_not_allowed");
      $("login-error").classList.remove("hidden");
      return;
    }
    try {
      const data = await apiJson("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!assertAdminSession(data.user)) return;
      setToken(data.token || data.accessToken);
      persistApiBase();
      showDashboard(data.user);
      setSection("overview");
      bindUsersTableActions();
      bindPaginationBars();
      await loadAll();
    } catch (e) {
      $("login-error").textContent = e.message || t("err_login_failed");
      $("login-error").classList.remove("hidden");
    }
  });
}

$("btn-logout")?.addEventListener("click", () => {
  setToken(null);
  adminSessionUser = null;
  showLogin();
});

$("btn-refresh")?.addEventListener("click", () => {
  if (currentSection === "overview") loadStats();
  else if (currentSection === "users") loadUsers();
  else if (currentSection === "rides") loadRides();
  else if (currentSection === "reports") loadReports();
  else if (currentSection === "tx") loadTransactions();
  else if (currentSection === "audit") loadAudit();
  else loadAll();
});

$("btn-hero-action")?.addEventListener("click", () => {
  $("btn-refresh")?.click();
});

$("global-search")?.addEventListener("input", () => applyTableFilter());

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sec = btn.getAttribute("data-section");
    if (!sec) return;
    setSection(sec);
    if (sec === "overview") loadStats();
    if (sec === "users") loadUsers();
    if (sec === "rides") loadRides();
    if (sec === "reports") loadReports();
    if (sec === "tx") loadTransactions();
    if (sec === "audit") loadAudit();
  });
});

bindPaginationBars();

applyStaticI18n();
bindLangButtons();
initApiBaseField();
trySession();
