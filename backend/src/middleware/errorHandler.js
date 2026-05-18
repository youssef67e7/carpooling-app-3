import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: "Invalid id" });
  }
  if (err && err.code === 11000) {
    const kv = err?.keyValue && typeof err.keyValue === "object" ? err.keyValue : null;
    const keys = kv ? Object.keys(kv) : [];
    const field = keys[0] || "value";
    // Common case: unique email
    const msg =
      field === "email"
        ? "Email already in use"
        : `Duplicate ${field}`;
    return res.status(409).json({ message: msg, field, keyValue: kv || undefined });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Server error";
  if (status >= 500) {
    console.error(err);
  }
  return res.status(status).json({ message });
}
