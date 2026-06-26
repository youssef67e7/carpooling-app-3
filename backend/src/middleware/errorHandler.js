import { AppError } from "../errors/AppError.js";
import { logAction } from "../utils/logger.js";

function errRes(res, status, code, message, details) {
  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    logAction({ req, action: `AppError: ${err.message}`, file: "middleware/errorHandler.js", error: err });
    return errRes(res, err.status, err.code || "SERVER_ERROR", err.message);
  }
  if (err && (err.code === "invalid-argument" || err.message?.includes("Invalid id"))) {
    logAction({ req, action: "Invalid id error", file: "middleware/errorHandler.js", error: err });
    return errRes(res, 400, "INVALID_ID", "Invalid id");
  }
  if (err && (err.code === 11000 || err.code === "23505")) {
    const kv = err?.keyValue && typeof err.keyValue === "object" ? err.keyValue : null;
    const keys = kv ? Object.keys(kv) : [];
    const field = keys[0] || "value";
    const msg = field === "email" ? "Email already in use" : `Duplicate ${field}`;
    logAction({ req, action: `Duplicate key: ${field}`, file: "middleware/errorHandler.js", error: err });
    return errRes(res, 409, "DUPLICATE", msg, { field, keyValue: kv || undefined });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Server error";
  logAction({ req, action: `Server error (${status})`, file: "middleware/errorHandler.js", error: err });
  return errRes(res, status, "SERVER_ERROR", message);
}
