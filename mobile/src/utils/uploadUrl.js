import { apiBaseURL } from "../api/client";

/** Turn absolute dev URLs back into `/uploads/...` paths for API validation. */
export function toApiUploadUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  const base = String(apiBaseURL || "").replace(/\/$/, "");
  if (base && s.startsWith(base)) {
    const rel = s.slice(base.length);
    return rel.startsWith("/") ? rel : `/${rel}`;
  }
  try {
    const u = new URL(s);
    if (u.pathname.startsWith("/uploads/")) return u.pathname;
  } catch {
    /* ignore */
  }
  return s;
}

export function toAbsoluteUploadUrl(maybeRelative) {
  const s = String(maybeRelative || "");
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${String(apiBaseURL || "").replace(/\/$/, "")}${s}`;
  return s;
}
