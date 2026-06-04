import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { User } from "../models/User.js";
import { PassengerProfile } from "../models/PassengerProfile.js";
import { AppError } from "../errors/AppError.js";
import { isFixedAdminEmail, normalizeAdminEmail } from "../config/fixedAdmins.js";

function isDuplicateKeyError(e) {
  const msg = String(e?.message || "");
  return e?.code === 11000 || msg.includes("E11000") || msg.toLowerCase().includes("duplicate key");
}

/**
 * Best-effort lookup when a race causes duplicate-key on create.
 * @param {{ sub: string, email: string, googleSub: string | null, provider: "firebase" | "google" }} g
 * @param {string} emailNorm
 */
async function findExistingAfterDuplicate(g, emailNorm) {
  const or = [{ email: emailNorm }];
  if (g.provider === "firebase") {
    or.unshift({ firebaseUid: g.sub });
    if (g.googleSub) or.unshift({ googleSub: g.googleSub });
  } else {
    or.unshift({ googleSub: g.sub });
  }
  return await User.findOne({ $or: or });
}

/**
 * @param {{ sub: string, email: string, name: string, picture: string, googleSub: string | null, provider: "firebase" | "google" }} g
 */
export function buildGoogleUserLookup(g, emailNorm) {
  const or = [{ email: emailNorm }];
  if (g.provider === "firebase") {
    or.unshift({ firebaseUid: g.sub });
    if (g.googleSub) or.push({ googleSub: g.googleSub });
  } else {
    or.unshift({ googleSub: g.sub });
  }
  return { $or: or };
}

/**
 * @param {import("mongoose").Document} user
 * @param {{ sub: string, name: string, picture: string, googleSub: string | null, provider: "firebase" | "google" }} g
 */
export function applyGoogleProfileToUser(user, g) {
  if (g.provider === "firebase") {
    user.firebaseUid = g.sub;
    if (g.googleSub) user.googleSub = g.googleSub;
  } else {
    user.googleSub = g.sub;
  }
  if (g.picture) user.profileImageUrl = g.picture.slice(0, 500);
  if (g.name) user.name = g.name;
}

/**
 * @param {{ sub: string, email: string, name: string, picture: string, googleSub: string | null, provider: "firebase" | "google" }} g
 */
export async function upsertUserFromGoogleSignIn(g, { lat, lng } = {}) {
  const emailNorm = normalizeAdminEmail(g.email);
  const lookup = buildGoogleUserLookup(g, emailNorm);

  if (isFixedAdminEmail(emailNorm)) {
    let user = await User.findOne(lookup);
    if (user && g.provider === "google" && user.googleSub && user.googleSub !== g.sub) {
      throw new AppError("This email is linked to another Google account", 409);
    }
    if (user && g.provider === "firebase" && user.firebaseUid && user.firebaseUid !== g.sub) {
      throw new AppError("This email is linked to another account", 409);
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
          googleSub: g.googleSub || (g.provider === "google" ? g.sub : null),
          firebaseUid: g.provider === "firebase" ? g.sub : null,
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
    if (g.provider === "google" && user.googleSub && user.googleSub !== g.sub) {
      throw new AppError("This email is registered with a different Google account", 409);
    }
    if (g.provider === "firebase" && user.firebaseUid && user.firebaseUid !== g.sub) {
      throw new AppError("This email is registered with a different account", 409);
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
        googleSub: g.googleSub || (g.provider === "google" ? g.sub : null),
        firebaseUid: g.provider === "firebase" ? g.sub : null,
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
