/**
 * Only these emails may authenticate as admin or call /admin/*.
 * Password material lives in AdminAccount (bcrypt) — see ensureFixedAdminAccounts.
 */
export const FIXED_ADMIN_EMAILS = ["youssef@gmail.com", "youssef1@gmail.com"];

/** Env keys: prefer bcrypt hashes in production; optional one-time plain passwords for local bootstrap. */
export const FIXED_ADMIN_ENV = [
  { email: "youssef@gmail.com", hashEnv: "ADMIN_BCRYPT_YOUSSEF", passEnv: "ADMIN_PASSWORD_YOUSSEF" },
  { email: "youssef1@gmail.com", hashEnv: "ADMIN_BCRYPT_YOUSSEF1", passEnv: "ADMIN_PASSWORD_YOUSSEF1" },
];

export function normalizeAdminEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function isFixedAdminEmail(email) {
  const n = normalizeAdminEmail(email);
  return FIXED_ADMIN_EMAILS.includes(n);
}
