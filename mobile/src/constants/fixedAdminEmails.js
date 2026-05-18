/** Must match backend FIXED_ADMIN_EMAILS (client-side UX only; server enforces). */
export const FIXED_ADMIN_EMAILS = ["youssef@gmail.com", "youssef1@gmail.com"];

export function isFixedAdminEmail(email) {
  return FIXED_ADMIN_EMAILS.includes(String(email || "").trim().toLowerCase());
}
