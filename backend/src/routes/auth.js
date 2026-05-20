import { randomBytes } from "crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { User } from "../models/User.js";
import { AdminAccount } from "../models/AdminAccount.js";
import { PassengerProfile } from "../models/PassengerProfile.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";
import { authWriteLimiter } from "../middleware/rateLimiters.js";
import { isFixedAdminEmail, normalizeAdminEmail } from "../config/fixedAdmins.js";
import { signUserToken } from "../utils/signUserToken.js";
import { verifyGoogleIdToken, isGoogleAuthConfigured } from "../utils/verifyGoogleIdToken.js";
import { PhoneLoginOtp } from "../models/PhoneLoginOtp.js";
import { normalizePhone, hashPhoneOtp, randomPhoneOtp6, syntheticEmailForPhone } from "../utils/phoneOtp.js";

const router = Router();
const PHONE_OTP_TTL_MS = 10 * 60 * 1000;
const PHONE_OTP_MAX_ATTEMPTS = 5;

async function finalizeUserForSession(user) {
  const now = new Date();
  if (user.is_blocked && user.blocked_until && user.blocked_until <= now) {
    user.is_blocked = false;
    user.blocked_until = undefined;
    user.block_reason = "";
    await user.save();
  } else if (user.is_blocked) {
    if (user.blocked_until && user.blocked_until > now) {
      throw new AppError("Account suspended. Try again after the suspension ends.", 403);
    }
    throw new AppError("Account blocked. Contact support.", 403);
  }
  if (user.is_verified === false && user.role !== "admin") {
    throw new AppError("Account pending admin approval.", 403);
  }
  if (user.role === "admin" && user.is_verified === false) {
    user.is_verified = true;
    await user.save();
  }
}

router.get("/google-config", (_req, res) => {
  const webClientId = String(process.env.GOOGLE_OAUTH_WEB_CLIENT_ID || "").trim();
  const iosClientId = String(process.env.GOOGLE_OAUTH_IOS_CLIENT_ID || "").trim();
  const androidClientId = String(process.env.GOOGLE_OAUTH_ANDROID_CLIENT_ID || "").trim();
  const expoClientId = String(process.env.GOOGLE_OAUTH_EXPO_CLIENT_ID || "").trim();
  res.json({
    enabled: isGoogleAuthConfigured(),
    webClientId,
    iosClientId,
    androidClientId,
    expoClientId,
    /** Hints for Google Cloud Console → Web client → Authorized redirect URIs */
    redirectUriHints: ["weret:/oauthredirect", "com.ridehail.app:/oauthredirect"],
  });
});

router.post(
  "/google",
  authWriteLimiter,
  body("idToken").isString().notEmpty().isLength({ max: 12000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      if (!isGoogleAuthConfigured()) {
        throw new AppError("Google sign-in is not enabled on this server", 503);
      }
      let g;
      try {
        g = await verifyGoogleIdToken(req.body.idToken);
      } catch (e) {
        if (e.code === "GOOGLE_EMAIL_UNVERIFIED") throw new AppError(e.message, 403);
        if (e.code === "GOOGLE_NOT_CONFIGURED") {
          throw new AppError("Google sign-in is not enabled on this server", 503);
        }
        const devHint =
          process.env.NODE_ENV !== "production" && e?.message ? String(e.message).slice(0, 200) : null;
        throw new AppError(devHint || "Google sign-in failed", 401);
      }
      const emailNorm = normalizeAdminEmail(g.email);

      if (isFixedAdminEmail(emailNorm)) {
        let user = await User.findOne({ $or: [{ googleSub: g.sub }, { email: emailNorm }] });
        if (user && user.googleSub && user.googleSub !== g.sub) {
          throw new AppError("This email is linked to another Google account", 409);
        }
        if (!user) {
          user = await User.create({
            name: g.name || "Administrator",
            email: emailNorm,
            password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
            role: "admin",
            active_role: "passenger",
            isOnline: false,
            googleSub: g.sub,
            profileImageUrl: g.picture || "",
            is_verified: true,
            is_blocked: false,
            location: { lat: 0, lng: 0 },
          });
        } else {
          user.role = "admin";
          user.googleSub = g.sub;
          if (g.picture && !user.profileImageUrl) user.profileImageUrl = g.picture;
          if (g.name) user.name = g.name;
          await user.save();
        }
        await finalizeUserForSession(user);
        const fresh = await User.findById(user._id);
        const token = signUserToken(fresh);
        return res.json({ token, user: fresh.toJSON() });
      }

      let user = await User.findOne({ googleSub: g.sub });
      if (!user) {
        user = await User.findOne({ email: emailNorm });
      }
      if (user) {
        if (user.role === "admin") {
          throw new AppError("Invalid credentials", 401);
        }
        if (user.googleSub && user.googleSub !== g.sub) {
          throw new AppError("This email is registered with a different Google account", 409);
        }
        user.googleSub = g.sub;
        if (g.picture) user.profileImageUrl = g.picture.slice(0, 500);
        if (g.name) user.name = g.name;
        await user.save();
      } else {
        user = await User.create({
          name: g.name,
          email: emailNorm,
          password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
          role: "passenger",
          active_role: "passenger",
          isOnline: false,
          googleSub: g.sub,
          profileImageUrl: g.picture || "",
          phone: "",
          is_verified: true,
          is_blocked: false,
          location: {
            lat: Number(req.body.lat) || 24.7136,
            lng: Number(req.body.lng) || 46.6753,
          },
        });
        await PassengerProfile.updateOne({ userId: user._id }, { $set: { userId: user._id } }, { upsert: true });
      }
      await finalizeUserForSession(user);
      const fresh = await User.findById(user._id);
      const token = signUserToken(fresh);
      return res.json({ token, user: fresh.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/register",
  authWriteLimiter,
  body("name").trim().notEmpty().isLength({ max: 80 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6, max: 128 }),
  body("lat").optional().isFloat({ min: -90, max: 90 }),
  body("lng").optional().isFloat({ min: -180, max: 180 }),
  body("profileImageUrl")
    .optional({ checkFalsy: true })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .isLength({ max: 500 }),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 32 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { name, email, password, profileImageUrl, phone } = req.body;
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) throw new AppError("Email already registered", 409);
      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hash,
        role: "passenger",
        active_role: "passenger",
        isOnline: false,
        profileImageUrl: profileImageUrl || "",
        phone: typeof phone === "string" ? phone.trim().slice(0, 32) : "",
        location: {
          lat: Number(req.body.lat) || 24.7136,
          lng: Number(req.body.lng) || 46.6753,
        },
      });
      await PassengerProfile.updateOne({ userId: user._id }, { $set: { userId: user._id } }, { upsert: true });
      const token = signUserToken(user);
      return res.status(201).json({ token, user: user.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new AppError("User not found", 401);
    if (user.role === "admin" && !isFixedAdminEmail(user.email)) {
      user.role = "passenger";
      await user.save();
    }
    return res.json({ user: user.toJSON() });
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/profile",
  authRequired,
  blockCheck,
  body("name").optional().trim().isLength({ min: 1, max: 80 }),
  body("phone").optional().trim().isLength({ max: 32 }),
  body("profileImageUrl")
    .optional({ checkFalsy: true })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .isLength({ max: 500 }),
  body("vehicleType")
    .optional()
    .trim()
    .isIn([
      "shipping",
      "delivery",
      "travel",
      "motorcycle",
      "car_standard",
      "car_comfort",
      "economy",
      "xl",
      "premium",
    ]),
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) throw new AppError("User not found", 404);
      if (typeof req.body.name === "string" && req.body.name.trim()) {
        user.name = req.body.name.trim();
      }
      if ("phone" in req.body && typeof req.body.phone === "string") {
        user.phone = req.body.phone.trim().slice(0, 32);
      }
      if (typeof req.body.profileImageUrl === "string" && req.body.profileImageUrl.trim()) {
        user.profileImageUrl = req.body.profileImageUrl.trim().slice(0, 500);
      }
      const mode = user.role === "admin" ? "admin" : (user.active_role || user.role || "passenger");
      if (mode === "driver" && "vehicleType" in req.body && typeof req.body.vehicleType === "string") {
        user.vehicleType = String(req.body.vehicleType).toLowerCase().trim();
      }
      await user.save();
      return res.json({ user: user.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/phone/otp",
  authWriteLimiter,
  body("phone").trim().notEmpty().isLength({ min: 8, max: 32 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const phone = normalizePhone(req.body.phone);
      if (!phone) throw new AppError("Invalid phone number", 400);
      const otp = randomPhoneOtp6();
      const expiresAt = new Date(Date.now() + PHONE_OTP_TTL_MS);
      await PhoneLoginOtp.deleteMany({ phone });
      await PhoneLoginOtp.create({ phone, otpDigest: hashPhoneOtp(otp), expiresAt, attempts: 0 });
      if (process.env.NODE_ENV !== "production") {
        console.log(`[auth] Phone OTP for ${phone}: ${otp}`);
      }
      return res.json({
        ok: true,
        phone,
        message: "OTP sent",
        _devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/phone/verify",
  authWriteLimiter,
  body("phone").trim().notEmpty().isLength({ min: 8, max: 32 }),
  body("otp").trim().isLength({ min: 4, max: 8 }),
  body("name").optional().trim().isLength({ max: 80 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const phone = normalizePhone(req.body.phone);
      if (!phone) throw new AppError("Invalid phone number", 400);
      const otp = String(req.body.otp || "").trim();
      const record = await PhoneLoginOtp.findOne({ phone }).sort({ createdAt: -1 });
      if (!record || record.expiresAt <= new Date()) {
        throw new AppError("Code expired. Request a new one.", 400);
      }
      if (record.attempts >= PHONE_OTP_MAX_ATTEMPTS) {
        throw new AppError("Too many attempts. Request a new code.", 429);
      }
      if (hashPhoneOtp(otp) !== record.otpDigest) {
        record.attempts += 1;
        await record.save();
        throw new AppError("Invalid code", 401);
      }
      await PhoneLoginOtp.deleteMany({ phone });

      let user = await User.findOne({ phone });
      if (!user) {
        const email = syntheticEmailForPhone(phone);
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
          existingEmail.phone = phone;
          user = existingEmail;
          await user.save();
        } else {
          user = await User.create({
            name: String(req.body.name || "").trim().slice(0, 80) || phone,
            email,
            password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
            role: "passenger",
            active_role: "passenger",
            isOnline: false,
            phone,
            profileImageUrl: "",
            is_verified: true,
            is_blocked: false,
            location: { lat: 24.7136, lng: 46.6753 },
          });
          await PassengerProfile.updateOne({ userId: user._id }, { $set: { userId: user._id } }, { upsert: true });
        }
      } else if (user.role === "admin") {
        throw new AppError("Invalid credentials", 401);
      } else if (!user.phone || user.phone !== phone) {
        user.phone = phone;
        await user.save();
      }

      await finalizeUserForSession(user);
      const fresh = await User.findById(user._id);
      const token = signUserToken(fresh);
      return res.json({ token, user: fresh.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/login",
  authWriteLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const emailNorm = normalizeAdminEmail(email);

      if (isFixedAdminEmail(emailNorm)) {
        const acc = await AdminAccount.findOne({ email: emailNorm });
        if (!acc) throw new AppError("Invalid credentials", 401);
        const okAcc = await bcrypt.compare(password, acc.passwordHash);
        if (!okAcc) throw new AppError("Invalid credentials", 401);

        let user = await User.findOne({ email: emailNorm });
        if (!user) {
          user = await User.create({
            name: "Administrator",
            email: emailNorm,
            password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
            role: "admin",
            is_verified: true,
            is_blocked: false,
          });
        } else {
          if (user.role !== "admin") {
            user.role = "admin";
            await user.save();
          }
        }

        const now = new Date();
        if (user.is_blocked && user.blocked_until && user.blocked_until <= now) {
          user.is_blocked = false;
          user.blocked_until = undefined;
          user.block_reason = "";
          await user.save();
        } else if (user.is_blocked) {
          if (user.blocked_until && user.blocked_until > now) {
            throw new AppError("Account suspended. Try again after the suspension ends.", 403);
          }
          throw new AppError("Account blocked. Contact support.", 403);
        }
        if (user.is_verified === false) {
          user.is_verified = true;
          await user.save();
        }
        const token = signUserToken(user);
        return res.json({ token, user: user.toJSON() });
      }

      const user = await User.findOne({ email: emailNorm });
      if (!user) throw new AppError("Invalid credentials", 401);
      if (user.role === "admin") {
        throw new AppError("Invalid credentials", 401);
      }
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        if (user.googleSub) throw new AppError("This account uses Google sign-in", 401);
        throw new AppError("Invalid credentials", 401);
      }
      const now = new Date();
      if (user.is_blocked && user.blocked_until && user.blocked_until <= now) {
        user.is_blocked = false;
        user.blocked_until = undefined;
        user.block_reason = "";
        await user.save();
      } else if (user.is_blocked) {
        if (user.blocked_until && user.blocked_until > now) {
          throw new AppError("Account suspended. Try again after the suspension ends.", 403);
        }
        throw new AppError("Account blocked. Contact support.", 403);
      }
      if (user.is_verified === false) {
        throw new AppError("Account pending admin approval.", 403);
      }
      const token = signUserToken(user);
      return res.json({ token, user: user.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
