import rateLimit from "express-rate-limit";

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const onVercel = Boolean(process.env.VERCEL);

const rateLimitOpts = onVercel ? { validate: false } : {};

/** General API traffic (tune via env for production). */
export const globalApiLimiter = onVercel
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs,
      max: Number(process.env.RATE_LIMIT_MAX) || 500,
      standardHeaders: true,
      legacyHeaders: false,
      ...rateLimitOpts,
    });

/** Stricter limit for register / login to reduce brute-force. */
export const authWriteLimiter = onVercel
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
      message: { message: "Too many attempts, try again later." },
      standardHeaders: true,
      legacyHeaders: false,
      ...rateLimitOpts,
    });
