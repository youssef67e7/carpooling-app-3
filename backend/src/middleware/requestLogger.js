import { log } from "../utils/logger.js";

export function requestLogger(req, res, next) {
  const start = Date.now();
  const meta = {
    file: "middleware/requestLogger.js",
    action: `${req.method} ${req.originalUrl || req.url}`,
    userId: req?.userId || req?.user?.sub || null,
    role: req?.user?.role || null,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req?.ip || req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || null,
    userAgent: req?.headers?.["user-agent"]?.slice(0, 200) || null,
  };

  const originalEnd = res.end;
  res.end = function (...args) {
    res.end = originalEnd;
    const duration = Date.now() - start;
    meta.statusCode = res.statusCode;
    meta.durationMs = duration;
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
    log(level, meta);
    return originalEnd.apply(this, args);
  };

  next();
}
