import { isFixedAdminEmail } from "../config/fixedAdmins.js";

/**
 * Use after roleRequired("admin") so req.user is set.
 * Ensures only the two fixed admin emails can access admin APIs (even if JWT role is stale).
 */
export function fixedAdminOnly(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(500).json({ message: "Server error" });
    }
    if (!isFixedAdminEmail(user.email)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  } catch (e) {
    next(e);
  }
}
