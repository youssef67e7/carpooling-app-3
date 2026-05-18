import rateLimit from "express-rate-limit";

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

/** General API traffic (tune via env for production). */
export const globalApiLimiter = rateLimit({
  windowMs,
  max: Number(process.env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Stricter limit for register / login to reduce brute-force. */
export const authWriteLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  message: { message: "Too many attempts, try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
