import jwt from "jsonwebtoken";
const { TokenExpiredError } = jwt;
import { User } from "../models/User.js";

/**
 * Resolve caller from Authorization header (app JWT).
 */
export async function resolveAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ success: false, error: { code: "TOKEN_MISSING", message: "Missing token" } });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = String(payload.sub);
    req.authVia = "jwt";
    return next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({ success: false, error: { code: "TOKEN_EXPIRED", message: "Access token expired" } });
    }
    return res.status(401).json({ success: false, error: { code: "TOKEN_INVALID", message: "Invalid access token" } });
  }
}

export function authRequired(req, res, next) {
  return resolveAuth(req, res, next);
}

/** After auth: reject blocked / suspended accounts. */
export async function blockCheck(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("is_blocked blocked_until role");
    if (!user) return res.status(401).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
    const now = new Date();
    if (user.is_blocked && user.blocked_until && user.blocked_until <= now) {
      await User.updateOne({ _id: user._id }, { $set: { is_blocked: false, blocked_until: null, block_reason: "" } });
      return next();
    }
    if (user.is_blocked) {
      if (user.blocked_until && user.blocked_until > now) {
        return res.status(403).json({
          success: false,
          error: {
            code: "ACCOUNT_SUSPENDED",
            message: "Account suspended",
            details: { until: user.blocked_until.toISOString() },
          },
        });
      }
      return res.status(403).json({ success: false, error: { code: "ACCOUNT_BLOCKED", message: "Account blocked" } });
    }
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Authenticate and attach full user object to req.user.
 * Combines resolveAuth + user fetch + blockCheck.
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) {
      return res.status(401).json({ success: false, error: { code: "TOKEN_MISSING", message: "Missing token" } });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = String(payload.sub);
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(401).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
    const now = new Date();
    if (user.is_blocked && user.blocked_until && user.blocked_until <= now) {
      await User.updateOne({ _id: user._id }, { $set: { is_blocked: false, blocked_until: null, block_reason: "" } });
    } else if (user.is_blocked) {
      if (user.blocked_until && user.blocked_until > now) {
        return res
          .status(403)
          .json({
            success: false,
            error: { code: "ACCOUNT_SUSPENDED", message: "Account suspended", details: { until: user.blocked_until } },
          });
      }
      return res.status(403).json({ success: false, error: { code: "ACCOUNT_BLOCKED", message: "Account blocked" } });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: { code: "TOKEN_EXPIRED", message: "Access token expired" } });
    }
    return res.status(401).json({ success: false, error: { code: "TOKEN_INVALID", message: "Invalid access token" } });
  }
}

export function roleRequired(...roles) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(401).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
      const mode = user.role === "admin" ? "admin" : user.active_role || user.role || "passenger";
      const ok = roles.includes(mode) || (roles.includes("admin") && user.role === "admin");
      if (!ok) return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } });
      req.user = user;
      next();
    } catch (e) {
      return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Server error" } });
    }
  };
}
