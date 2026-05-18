/**
 * Admin web — same APIs as mobile (`/auth`, `/admin/*`).
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
    pageTitle: "لوحة الإدارة — ReachNative",
    modal_default_title: "تأكيد",
    modal_cancel: "إلغاء",
    modal_ok: "تأكيد",
    login_brand_title: "لوحة الإدارة",
    login_brand_sub: "نفس API التطبيق — صلاحيات موحدة",
    login_heading: "تسجيل الدخول",
    login_secure_note: "مسؤولون ثابتون فقط (مصادقة الخادم).",
    label_api: "عنوان الخادم (API)",
    ph_api: "فارغ = نفس المنشأ (/admin-ui/)",
    label_email: "البريد",
    label_password: "كلمة المرور",
    btn_login: "دخول",
    login_google_or: "أو",
    nav_brand_sub: "إدارة",
    nav_overview: "لوحة التحكم",
    nav_users: "المستخدمون",
    nav_rides: "الرحلات",
    nav_reports: "البلاغات",
    nav_tx: "المعاملات",
    nav_audit: "سجل القرارات",
    btn_logout: "تسجيل الخروج",
    ph_search: "بحث في القائمة الحالية…",
    btn_refresh: "تحديث",
    sec_overview: "لوحة التحكم",
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
    action_verify: "توثيق",
    action_approve_driver: "قبول سائق",
    action_reject_driver: "رفض سائق",
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
  },
  en: {
    pageTitle: "Admin Panel — ReachNative",
    modal_default_title: "Confirm",
    modal_cancel: "Cancel",
    modal_ok: "Confirm",
    login_brand_title: "Admin panel",
    login_brand_sub: "Same app API — unified permissions",
    login_heading: "Sign in",
    login_secure_note: "Fixed admins only (server-validated).",
    label_api: "Server URL (API)",
    ph_api: "Empty = same origin (/admin-ui/)",
    label_email: "Email",
    label_password: "Password",
    btn_login: "Sign in",
    login_google_or: "Or",
    nav_brand_sub: "Management",
    nav_overview: "Dashboard",
    nav_users: "Users",
    nav_rides: "Rides",
    nav_reports: "Reports",
    nav_tx: "Transactions",
    nav_audit: "Decision log",
    btn_logout: "Log out",
    ph_search: "Search current table…",
    btn_refresh: "Refresh",
    sec_overview: "Dashboard",
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
    action_verify: "Verify",
    action_approve_driver: "Approve driver",
    action_reject_driver: "Reject driver",
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
    setToken(data.token);
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
  $("whoami").textContent = user?.name ? `${user.name} (${user.email})` : user?.email || "";
}

function setSection(name) {
  currentSection = name;
  const titles = {
    overview: t("sec_overview"),
    users: t("sec_users"),
    rides: t("sec_rides"),
    reports: t("sec_reports"),
    tx: t("sec_tx"),
    audit: t("sec_audit"),
  };
  $("main-title").textContent = titles[name] || titles.overview;
  document.querySelectorAll(".section-panel").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  const panel = $(`section-${name === "overview" ? "overview" : name}`);
  if (panel) panel.classList.remove("hidden");
  const navBtn = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (navBtn) navBtn.classList.add("active");
  applyTableFilter();
}

function skeletonStats(show) {
  const sk = $("stats-skeleton");
  const gr = $("stats-grid");
  if (!sk || !gr) return;
  if (show) {
    sk.classList.remove("hidden");
    gr.classList.add("hidden");
    sk.innerHTML = Array(4)
      .fill(0)
      .map(() => `<div class="skeleton-card"></div>`)
      .join("");
  } else {
    sk.classList.add("hidden");
    gr.classList.remove("hidden");
  }
}

function skeletonTable(id, show, rows = 6) {
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

async function loadStats() {
  $("stats-error").classList.add("hidden");
  skeletonStats(true);
  try {
    const { stats } = await apiJson("/admin/stats");
    skeletonStats(false);
    const grid = $("stats-grid");
    const items = [
      [t("stats_users"), stats.totalUsers],
      [t("stats_rides"), stats.totalRides],
      [t("stats_drivers_online"), stats.driversOnline],
      [t("stats_active_rides"), stats.activeRides],
    ];
    const by = stats.ridesByStatus || {};
    Object.keys(by).forEach((k) => {
      items.push([`${t("stats_rides_prefix")} ${k}`, by[k]]);
    });
    grid.classList.add("stagger-children");
    grid.innerHTML = items
      .map(
        ([lbl, num]) =>
          `<div class="stat"><div class="num">${esc(num)}</div><div class="lbl">${esc(lbl)}</div></div>`
      )
      .join("");
  } catch (e) {
    skeletonStats(false);
    $("stats-error").textContent = e.message || String(e);
    $("stats-error").classList.remove("hidden");
  }
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
    const { users } = await apiJson("/admin/users");
    skeletonTable("users-skeleton", false);
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
    const { rides } = await apiJson("/admin/rides");
    skeletonTable("rides-skeleton", false);
    body.innerHTML = (rides || [])
      .map((r) => {
        const p = r.passengerId?.name || r.passengerId?.email || "—";
        const d = r.driverId?.name || r.driverId?.email || "—";
        const fare = r.agreedFare ?? r.estimatedFare ?? "—";
        const dt = r.createdAt ? new Date(r.createdAt).toLocaleString(localeForDates()) : "—";
        return `<tr>
          <td>${esc(r.status)}</td>
          <td>${esc(p)}</td>
          <td>${esc(d)}</td>
          <td class="mono">${esc(fare)}</td>
          <td class="mono">${esc(dt)}</td>
        </tr>`;
      })
      .join("");
    if (!rides?.length) body.innerHTML = `<tr><td colspan="5">${esc(t("empty_rides"))}</td></tr>`;
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
    const { reports } = await apiJson("/admin/reports");
    skeletonTable("reports-skeleton", false);
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
        return `<tr>
          <td><span class="status-badge">${esc(reportStatusLabel(r.status))}</span></td>
          <td>${esc(r.reason)}</td>
          <td>${esc(rep)}${rpSep()}${esc(tgt)}</td>
          <td class="mono" style="max-width:220px">${esc((r.description || "").slice(0, 120))}${(r.description || "").length > 120 ? "…" : ""}</td>
          <td>
            <select class="select-compact" data-report-status="${esc(r._id)}" aria-label="${esc(t("aria_report_status"))}">${opts}</select>
          </td>
        </tr>`;
      })
      .join("");
    if (!reports?.length) body.innerHTML = `<tr><td colspan="5">${esc(t("empty_reports"))}</td></tr>`;

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
    const { transactions } = await apiJson("/admin/transactions?limit=100");
    skeletonTable("tx-skeleton", false);
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
    const { logs } = await apiJson("/admin/audit?limit=120");
    skeletonTable("audit-skeleton", false);
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
  await Promise.all([loadStats(), loadUsers(), loadRides(), loadReports(), loadTransactions(), loadAudit()]);
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
  const q = ($("global-search")?.value || "").trim().toLowerCase();
  const panel = $(`section-${currentSection === "overview" ? "overview" : currentSection}`);
  if (!panel) return;
  const tb = panel.querySelector("tbody");
  if (!tb) return;
  tb.querySelectorAll("tr").forEach((tr) => {
    const t = tr.textContent.toLowerCase();
    tr.style.display = !q || t.includes(q) ? "" : "none";
  });
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
      setToken(data.token);
      persistApiBase();
      showDashboard(data.user);
      setSection("overview");
      bindUsersTableActions();
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

applyStaticI18n();
bindLangButtons();
initApiBaseField();
trySession();
