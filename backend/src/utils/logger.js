import { appendFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "../../logs");
const MAX_LOG_AGE_DAYS = 14;

const SENSITIVE_FIELDS = new Set([
  "password", "token", "accessToken", "refreshToken", "otp", "otpDigest",
  "secret", "authorization", "cookie", "idToken", "firebaseIdToken",
]);

function sanitize(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = sanitize(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function getLogFile() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return join(LOG_DIR, `app-${date}.log`);
}

async function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true });
  }
}

export async function log(level, meta = {}) {
  try {
    await ensureLogDir();
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      ...meta,
    };
    const line = JSON.stringify(entry) + "\n";
    await appendFile(getLogFile(), line, "utf8");

    if (level === "ERROR" || level === "WARN") {
      const prefix = `[${level}]`;
      const parts = [];
      if (meta.file) parts.push(`[${meta.file}]`);
      if (meta.action) parts.push(meta.action);
      if (meta.error) parts.push(meta.error);
      if (meta.userId) parts.push(`user=${meta.userId}`);
      console.error(`${prefix} ${parts.join(" — ")}`);
    }
  } catch {
    // silent — logger must never crash the app
  }
}

export function logAction({ req, action, file, error, extra = {} }) {
  const meta = {
    file,
    action,
    userId: req?.userId || req?.user?.sub || null,
    role: req?.user?.role || null,
    method: req?.method,
    path: req?.originalUrl || req?.url,
    ip: req?.ip || req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || null,
    userAgent: req?.headers?.["user-agent"]?.slice(0, 200) || null,
  };
  if (error) {
    meta.error = error instanceof Error ? error.message : String(error);
    meta.errorStack = error instanceof Error ? error.stack?.split("\n").slice(0, 4).join(";") : undefined;
  }
  if (Object.keys(extra).length) {
    meta.extra = sanitize(extra);
  }
  const level = error ? "ERROR" : "AUDIT";
  return log(level, meta);
}

export async function cleanupOldLogs() {
  try {
    await ensureLogDir();
    const { readdir, rm } = await import("fs/promises");
    const files = await readdir(LOG_DIR);
    const now = Date.now();
    for (const f of files) {
      if (!f.startsWith("app-") || !f.endsWith(".log")) continue;
      const filePath = join(LOG_DIR, f);
      const stat = await import("fs/promises").then(m => m.stat(filePath));
      const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays > MAX_LOG_AGE_DAYS) {
        await rm(filePath).catch(() => {});
      }
    }
  } catch {
    // silent
  }
}

export { LOG_DIR };
