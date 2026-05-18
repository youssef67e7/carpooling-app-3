import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/** After JWT: reject blocked / suspended accounts (JWT may predate moderation). */
export async function blockCheck(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("is_blocked blocked_until role");
    if (!user) return res.status(401).json({ message: "User not found" });
    const now = new Date();
    if (user.is_blocked && user.blocked_until && user.blocked_until <= now) {
      await User.updateOne(
        { _id: user._id },
        { $set: { is_blocked: false, blocked_until: null, block_reason: "" } }
      );
      return next();
    }
    if (user.is_blocked) {
      if (user.blocked_until && user.blocked_until > now) {
        return res.status(403).json({
          message: "Account suspended",
          until: user.blocked_until.toISOString(),
        });
      }
      return res.status(403).json({ message: "Account blocked" });
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function roleRequired(...roles) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      const mode = user.role === "admin" ? "admin" : (user.active_role || user.role || "passenger");
      const ok = roles.includes(mode) || (roles.includes("admin") && user.role === "admin");
      if (!ok) return res.status(403).json({ message: "Forbidden" });
      req.user = user;
      next();
    } catch (e) {
      return res.status(500).json({ message: "Server error" });
    }
  };
}
