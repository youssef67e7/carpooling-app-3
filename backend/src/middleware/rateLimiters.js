import rateLimit from "express-rate-limit";

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

/** Disable rate limiting in test mode (checked at runtime, not import-time). */
function skipInTest(handler) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();
    return handler(req, res, next);
  };
}

/** General API traffic (tune via env for production). */
export const globalApiLimiter = skipInTest(
  rateLimit({
    windowMs,
    max: Number(process.env.RATE_LIMIT_MAX) || 500,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  }),
);

/** Stricter limit for register / login to reduce brute-force. */
export const authWriteLimiter = skipInTest(
  rateLimit({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
    message: { message: "Too many attempts, try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  }),
);

/** Dedicated limiter for continuous GPS location streams (keeps them off the shared global pool). */
export const locationLimiter = skipInTest(
  rateLimit({
    windowMs: Number(process.env.LOCATION_RATE_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.LOCATION_RATE_LIMIT) || 1200,
    message: { message: "Too many location updates, try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  }),
);
