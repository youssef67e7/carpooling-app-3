import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { User } from "../models/User.js";
import { PassengerProfile } from "../models/PassengerProfile.js";
import { AppError } from "../errors/AppError.js";
import { isFixedAdminEmail, normalizeAdminEmail } from "../config/fixedAdmins.js";

function isDuplicateKeyError(e) {
  const msg = String(e?.message || "");
  return e?.code === 11000 || msg.includes("E11000") || msg.toLowerCase().includes("duplicate");
}

/**
 * @param {{ sub: string, email: string, googleSub: string | null }} g
 * @param {string} emailNorm
 */
async function findExistingAfterDuplicate(g, emailNorm) {
  const or = [{ email: emailNorm }, { googleSub: g.sub || g.googleSub }];
  return await User.findOne({ $or: or });
}

/**
 * @param {{ sub: string, email: string, googleSub: string | null }} g
 */
export function buildGoogleUserLookup(g, emailNorm) {
  return { $or: [{ googleSub: g.sub || g.googleSub }, { email: emailNorm }] };
}

/**
 * @param {object} user
 * @param {{ sub: string, name: string, picture: string, googleSub: string | null }} g
 */
export function applyGoogleProfileToUser(user, g) {
  user.googleSub = g.sub || g.googleSub;
  if (g.picture) user.profileImageUrl = g.picture.slice(0, 500);
  if (g.name) user.name = g.name;
}

/**
 * @param {{ sub: string, email: string, name: string, picture: string, googleSub: string | null }} g
 */
export async function upsertUserFromGoogleSignIn(g, { lat, lng } = {}) {
  const emailNorm = normalizeAdminEmail(g.email);
  const lookup = buildGoogleUserLookup(g, emailNorm);
  const googleSub = g.sub || g.googleSub;

  if (isFixedAdminEmail(emailNorm)) {
    let user = await User.findOne(lookup);
    if (user && user.googleSub && user.googleSub !== googleSub) {
      throw new AppError("This email is linked to another Google account", 409);
    }
    if (!user) {
      try {
        user = await User.create({
          name: g.name || "Administrator",
          email: emailNorm,
          password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
          role: "admin",
          active_role: "passenger",
          isOnline: false,
          googleSub,
          profileImageUrl: g.picture || "",
          is_verified: true,
          is_blocked: false,
          location: { lat: 0, lng: 0 },
        });
      } catch (e) {
        if (!isDuplicateKeyError(e)) throw e;
        user = await findExistingAfterDuplicate(g, emailNorm);
        if (!user) throw e;
        user.role = "admin";
        applyGoogleProfileToUser(user, g);
        await user.save();
      }
    } else {
      user.role = "admin";
      applyGoogleProfileToUser(user, g);
      await user.save();
    }
    return user;
  }

  let user = await User.findOne(lookup);
  if (user) {
    if (user.role === "admin") {
      throw new AppError("Invalid credentials", 401);
    }
    if (user.googleSub && user.googleSub !== googleSub) {
      throw new AppError("This email is registered with a different Google account", 409);
    }
    applyGoogleProfileToUser(user, g);
    await user.save();
  } else {
    try {
      user = await User.create({
        name: g.name,
        email: emailNorm,
        password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        role: "passenger",
        active_role: "passenger",
        isOnline: false,
        googleSub,
        profileImageUrl: g.picture || "",
        phone: "",
        is_verified: true,
        is_blocked: false,
        location: {
          lat: Number(lat) || 24.7136,
          lng: Number(lng) || 46.6753,
        },
      });
      await PassengerProfile.updateOne({ userId: user._id }, { $set: { userId: user._id } }, { upsert: true });
    } catch (e) {
      if (!isDuplicateKeyError(e)) throw e;
      user = await findExistingAfterDuplicate(g, emailNorm);
      if (!user) throw e;
      applyGoogleProfileToUser(user, g);
      await user.save();
    }
  }
  return user;
}
