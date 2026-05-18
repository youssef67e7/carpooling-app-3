import jwt from "jsonwebtoken";

/** Same payload shape as `routes/auth.js` `signToken` — keep JWT role in sync after role changes. */
export function signUserToken(user) {
  const role =
    user?.role === "admin"
      ? "admin"
      : (user?.active_role || user?.role || "passenger");
  return jwt.sign(
    { sub: user._id.toString(), role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
