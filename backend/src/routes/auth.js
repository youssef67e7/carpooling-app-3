import { randomBytes } from "crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { getDb } from "../mongo/client.js";
import { User } from "../models/User.js";
import { AdminAccount } from "../models/AdminAccount.js";
import { WalletAccount } from "../models/WalletAccount.js";
import { PassengerProfile } from "../models/PassengerProfile.js";
import { authRequired, blockCheck } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../errors/AppError.js";
import { authWriteLimiter } from "../middleware/rateLimiters.js";
import { isFixedAdminEmail, normalizeAdminEmail } from "../config/fixedAdmins.js";
import {
  googleAuthSchema,
  registerSchema,
  loginSchema,
  requestResetOtpSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
  verifyFirebasePhoneSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
} from "../schemas/auth.schemas.js";
import {
  generateRefreshToken,
  hashToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokens,
} from "../services/refreshTokenService.js";
import { refreshTokenSchema } from "../schemas/auth.schemas.js";
import { signUserToken } from "../utils/signUserToken.js";
import { logAction } from "../utils/logger.js";
import {
  isGoogleOrFirebaseSignInConfigured,
  resolveGoogleSignInToken,
} from "../utils/resolveGoogleSignInToken.js";
import { upsertUserFromGoogleSignIn } from "../utils/googleSignInUser.js";
import { PhoneLoginOtp } from "../models/PhoneLoginOtp.js";
import { EmailLoginOtp } from "../models/EmailLoginOtp.js";
import { EmailPasswordResetOtp } from "../models/EmailPasswordResetOtp.js";
import { normalizePhone, hashPhoneOtp, randomPhoneOtp6, syntheticEmailForPhone } from "../utils/phoneOtp.js";
import { hashEmailOtp, randomEmailOtp6 } from "../utils/emailOtp.js";
import { sendSms, buildLoginOtpMessage } from "../services/sendSms.js";
import { sendEmail } from "../services/sendEmail.js";
import { sendPhoneOtp, verifyPhoneOtp } from "../services/authNativeService.js";
import { verifyFirebasePhoneToken } from "../services/firebasePhoneService.js";
import { registerFcmTokenSchema } from "../schemas/misc.schemas.js";

const router = Router();
const PHONE_OTP_TTL_MS = 10 * 60 * 1000;
const PHONE_OTP_MAX_ATTEMPTS = 5;
const EMAIL_LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_LOGIN_OTP_MAX_ATTEMPTS = 5;
const EMAIL_RESET_OTP_TTL_MS = 15 * 60 * 1000;
const EMAIL_RESET_OTP_MAX_ATTEMPTS = 5;

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
    enabled: isGoogleOrFirebaseSignInConfigured(),
    webClientId,
    iosClientId,
    androidClientId,
    expoClientId,
    /** Web client ID from Google Cloud Console (same as GOOGLE_OAUTH_WEB_CLIENT_ID) */
    redirectUriHints: ["com.ridehail.app:/oauthredirect"],
  });
});

router.post(
  "/google",
  authWriteLimiter,
  validate(googleAuthSchema),
  body("idToken").isString().notEmpty().isLength({ max: 12000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      if (!isGoogleOrFirebaseSignInConfigured()) {
        throw new AppError("Google sign-in is not enabled on this server", 503);
      }
      let g;
      try {
        g = await resolveGoogleSignInToken(req.body.idToken);
      } catch (e) {
        if (e.code === "GOOGLE_EMAIL_UNVERIFIED") {
          throw new AppError(e.message, 403);
        }
        if (e.code === "GOOGLE_NOT_CONFIGURED" || e.code === "AUTH_NOT_CONFIGURED") {
          throw new AppError("Google sign-in is not enabled on this server", 503);
        }
        const devHint =
          process.env.NODE_ENV !== "production" && e?.message ? String(e.message).slice(0, 200) : null;
        throw new AppError(devHint || "Google sign-in failed", 401);
      }

      const user = await upsertUserFromGoogleSignIn(g, {
        lat: req.body.lat,
        lng: req.body.lng,
      });
      await finalizeUserForSession(user);
      const fresh = await User.findById(user._id);
      const accessToken = signUserToken(fresh);
      const rawRefreshToken = generateRefreshToken();
      await storeRefreshToken(fresh._id, rawRefreshToken);
      logAction({ req, action: "Google sign-in", file: "routes/auth.js:google", extra: { email: user.email } });
      return res.json({ accessToken, refreshToken: rawRefreshToken, user: fresh.toJSON() });
    } catch (e) {
      logAction({ req, action: "Google sign-in failed", file: "routes/auth.js:google", error: e });
      next(e);
    }
  }
);

router.post(
  "/login",
  authWriteLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = normalizeAdminEmail(email);
      if (!isFixedAdminEmail(normalizedEmail)) {
        throw new AppError("Email not allowed", 403);
      }
      const account = await AdminAccount.findOne({ email: normalizedEmail });
      if (!account) {
        throw new AppError("Admin account not found", 401);
      }
      const valid = await bcrypt.compare(password, account.passwordHash);
      if (!valid) {
        throw new AppError("Invalid password", 401);
      }
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        throw new AppError("User not found", 401);
      }
      await finalizeUserForSession(user);
      const fresh = await User.findById(user._id);
      const accessToken = signUserToken(fresh);
      const rawRefreshToken = generateRefreshToken();
      await storeRefreshToken(fresh._id, rawRefreshToken);
      logAction({ req, action: "Admin login", file: "routes/auth.js:login", extra: { email } });
      return res.json({ token: accessToken, refreshToken: rawRefreshToken, user: fresh.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/register",
  authWriteLimiter,
  validate(registerSchema),
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
      await WalletAccount.create({
        userId: user._id,
        walletType: "cash",
        phoneNumber: typeof phone === "string" ? phone.trim().slice(0, 32) : "",
        label: "Main wallet",
        balance: 0,
        isDefault: true,
      });
      const accessToken = signUserToken(user);
      const rawRefreshToken = generateRefreshToken();
      await storeRefreshToken(user._id, rawRefreshToken);
      logAction({ req, action: "Register", file: "routes/auth.js:register", extra: { email: user.email } });
      return res.status(201).json({ accessToken, refreshToken: rawRefreshToken, user: user.toJSON() });
    } catch (e) {
      logAction({ req, action: "Register failed", file: "routes/auth.js:register", error: e });
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
      logAction({ req, action: "Profile updated", file: "routes/auth.js:profile", extra: { fields: Object.keys(req.body) } });
      return res.json({ user: user.toJSON() });
    } catch (e) {
      logAction({ req, action: "Profile update failed", file: "routes/auth.js:profile", error: e });
      next(e);
    }
  }
);

router.post(
  "/phone/otp",
  authWriteLimiter,
  body("phone").trim().notEmpty().isLength({ min: 8, max: 32 }),
  body("forRegister").optional().isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const phone = normalizePhone(req.body.phone);
      if (!phone) throw new AppError("Invalid phone number", 400);
      const forRegister = req.body.forRegister === true;
      const existingUser = await User.findOne({ phone });
      if (forRegister && existingUser) {
        throw new AppError("Phone already registered. Use login instead.", 409);
      }
      const otp = randomPhoneOtp6();
      const expiresAt = new Date(Date.now() + PHONE_OTP_TTL_MS);
      await PhoneLoginOtp.deleteMany({ phone });
      await PhoneLoginOtp.create({ phone, otpDigest: hashPhoneOtp(otp), expiresAt, attempts: 0 });

      const sms = await sendSms({ to: phone, body: buildLoginOtpMessage(otp) });

      return res.json({
        ok: true,
        phone,
        accountExists: Boolean(existingUser),
        message: sms.sent ? "OTP sent via SMS" : "OTP generated (check server log in dev)",
        smsProvider: sms.provider,
        _devOtp: sms.dev ? otp : undefined,
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
      const accessToken = signUserToken(fresh);
      const rawRefreshToken = generateRefreshToken();
      await storeRefreshToken(fresh._id, rawRefreshToken);
      logAction({ req, action: "Phone OTP verify", file: "routes/auth.js:phone_verify", extra: { phone } });
      return res.json({ accessToken, refreshToken: rawRefreshToken, user: fresh.toJSON() });
    } catch (e) {
      logAction({ req, action: "Phone OTP verify failed", file: "routes/auth.js:phone_verify", error: e });
      next(e);
    }
  }
);

router.post(
  "/login",
  authWriteLimiter,
  validate(loginSchema),
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
        const accessToken = signUserToken(user);
        const rawRefreshToken = generateRefreshToken();
        await storeRefreshToken(user._id, rawRefreshToken);
        return res.json({ accessToken, refreshToken: rawRefreshToken, user: user.toJSON() });
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
      const accessToken = signUserToken(user);
      const rawRefreshToken = generateRefreshToken();
      await storeRefreshToken(user._id, rawRefreshToken);
      logAction({ req, action: "Login", file: "routes/auth.js:login", extra: { email: user.email } });
      return res.json({ accessToken, refreshToken: rawRefreshToken, user: user.toJSON() });
    } catch (e) {
      logAction({ req, action: "Login failed", file: "routes/auth.js:login", error: e });
      next(e);
    }
  }
);

router.post(
  "/verify-password",
  authRequired,
  blockCheck,
  body("password").isLength({ min: 6, max: 128 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) throw new AppError("User not found", 401);
      if (!user.password) {
        if (user.googleSub) throw new AppError("This account uses Google sign-in", 400);
        throw new AppError("Password not set", 400);
      }
      const ok = await bcrypt.compare(String(req.body.password), user.password);
      if (!ok) throw new AppError("Invalid password", 401);
      return res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/forgot-password",
  authWriteLimiter,
  validate(requestResetOtpSchema),
  body("email").isEmail().normalizeEmail(),
  validateRequest,
  async (req, res, next) => {
    try {
      const emailNorm = normalizeAdminEmail(req.body.email);
      const user = await User.findOne({ email: emailNorm });
      if (!user || user.role === "admin" || isFixedAdminEmail(emailNorm)) {
        return res.json({
          ok: true,
          message: "If an account exists, a reset code was generated.",
        });
      }
      if (user.googleSub) {
        throw new AppError("This account uses Google sign-in", 400);
      }
      const otp = randomEmailOtp6();
      const expiresAt = new Date(Date.now() + EMAIL_RESET_OTP_TTL_MS);
      await EmailPasswordResetOtp.deleteMany({ email: emailNorm });
      await EmailPasswordResetOtp.create({
        email: emailNorm,
        otpDigest: hashEmailOtp(otp),
        expiresAt,
        attempts: 0,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log(`[auth] Password reset OTP for ${emailNorm}: ${otp}`);
      }
      return res.json({
        ok: true,
        email: emailNorm,
        message: "Reset code generated (check server log in dev)",
        _devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/reset-password",
  authWriteLimiter,
  validate(resetPasswordSchema),
  body("email").isEmail().normalizeEmail(),
  body("otp").trim().isLength({ min: 4, max: 8 }),
  body("password").isLength({ min: 6, max: 128 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const emailNorm = normalizeAdminEmail(req.body.email);
      const otp = String(req.body.otp || "").trim();
      const user = await User.findOne({ email: emailNorm });
      if (!user || user.role === "admin") {
        throw new AppError("Invalid reset code", 400);
      }
      if (user.googleSub) {
        throw new AppError("This account uses Google sign-in", 400);
      }
      const record = await EmailPasswordResetOtp.findOne({ email: emailNorm }).sort({ createdAt: -1 });
      if (!record || record.expiresAt <= new Date()) {
        throw new AppError("Code expired. Request a new one.", 400);
      }
      if (record.attempts >= EMAIL_RESET_OTP_MAX_ATTEMPTS) {
        throw new AppError("Too many attempts. Request a new code.", 429);
      }
      if (record.otpDigest !== hashEmailOtp(otp)) {
        record.attempts += 1;
        await record.save();
        throw new AppError("Invalid reset code", 400);
      }
      await EmailPasswordResetOtp.deleteMany({ email: emailNorm });
      user.password = await bcrypt.hash(req.body.password, 10);
      await user.save();
      logAction({ req, action: "Password reset", file: "routes/auth.js:reset_password", extra: { email: emailNorm } });
      return res.json({ ok: true, message: "Password updated" });
    } catch (e) {
      logAction({ req, action: "Password reset failed", file: "routes/auth.js:reset_password", error: e });
      next(e);
    }
  }
);

// --- V2 auth endpoints (native SMS OTP) ---

router.post("/send-otp", validate(sendOtpSchema), async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Phone is required" } });
    }
    const result = await sendPhoneOtp(phone);
    return res.status(200).json({ success: true, data: { message: "OTP sent", code: result.code } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  }
});

router.post("/verify-otp", validate(verifyOtpSchema), async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Phone and code are required" } });
    }
    const result = await verifyPhoneOtp(phone, code);
    return res.status(200).json({
      success: true,
      data: { token: result.token, accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user, isNewUser: result.isNewUser },
    });
  } catch (err) {
    const msg = err.message;
    if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("not found")) {
      return res.status(400).json({ success: false, error: { code: "AUTH_ERROR", message: msg } });
    }
    if (msg.toLowerCase().includes("attempts") || msg.toLowerCase().includes("invalid")) {
      return res.status(401).json({ success: false, error: { code: "AUTH_ERROR", message: msg } });
    }
    return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: msg } });
  }
});

router.post("/verify-firebase-phone", validate(verifyFirebasePhoneSchema), async (req, res) => {
  const { firebaseIdToken, name } = req.body;
  if (!firebaseIdToken) {
    return res.status(400).type("json").send(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "firebaseIdToken is required" } }));
  }
  try {
    const result = await verifyFirebasePhoneToken(firebaseIdToken, name);
    return res.status(200).type("json").send(JSON.stringify({ success: true, data: result }));
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes("Invalid Firebase token")) {
      return res.status(401).type("json").send(JSON.stringify({ success: false, error: { code: "AUTH_ERROR", message: msg } }));
    }
    return res.status(500).type("json").send(JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: msg } }));
  }
});

// --- Email OTP login ---

router.post("/email/send-otp", authWriteLimiter, validate(sendEmailOtpSchema), async (req, res, next) => {
  try {
    const emailNorm = req.body.email.toLowerCase().trim();
    const otp = randomEmailOtp6();
    const expiresAt = new Date(Date.now() + EMAIL_LOGIN_OTP_TTL_MS);
    await EmailLoginOtp.deleteMany({ email: emailNorm });
    await EmailLoginOtp.create({
      email: emailNorm,
      otpDigest: hashEmailOtp(otp),
      expiresAt,
      attempts: 0,
    });
    await sendEmail({
      to: emailNorm,
      subject: "Your verification code",
      text: `Your verification code is: ${otp}\nValid for 10 minutes. Do not share this code.`,
    });
    return res.json({
      success: true,
      data: { message: "OTP sent", email: emailNorm, _devOtp: process.env.NODE_ENV !== "production" || process.env.EMAIL_CONSOLE_MODE ? otp : undefined },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/email/verify-otp", authWriteLimiter, validate(verifyEmailOtpSchema), async (req, res, next) => {
  try {
    const emailNorm = req.body.email.toLowerCase().trim();
    const code = String(req.body.code || "").trim();
    const record = await EmailLoginOtp.findOne({ email: emailNorm }).sort({ createdAt: -1 });
    if (!record || record.expiresAt <= new Date()) {
      return res.status(400).json({ success: false, error: { code: "OTP_EXPIRED", message: "Code expired. Request a new one." } });
    }
    if (record.attempts >= EMAIL_LOGIN_OTP_MAX_ATTEMPTS) {
      await EmailLoginOtp.deleteMany({ email: emailNorm });
      return res.status(429).json({ success: false, error: { code: "OTP_MAX_ATTEMPTS", message: "Too many attempts. Request a new code." } });
    }
    if (record.otpDigest !== hashEmailOtp(code)) {
      record.attempts += 1;
      await record.save();
      return res.status(401).json({ success: false, error: { code: "OTP_INVALID", message: "Invalid code" } });
    }
    await EmailLoginOtp.deleteMany({ email: emailNorm });
    let user = await User.findOne({ email: emailNorm });
    const isNewUser = !user;
    if (!user) {
      user = await User.create({
        email: emailNorm,
        name: emailNorm.split("@")[0],
        role: "passenger",
        active_role: "passenger",
        isOnline: false,
        is_verified: true,
      });
      await PassengerProfile.create({ userId: user._id });
    }
    await finalizeUserForSession(user);
    const fresh = await User.findById(user._id);
    const accessToken = signUserToken(fresh);
    const rawRefreshToken = generateRefreshToken();
    await storeRefreshToken(fresh._id, rawRefreshToken);
    logAction({ req, action: "Email OTP login", file: "routes/auth.js:email_verify_otp", extra: { email: emailNorm, isNewUser } });
    return res.json({
      success: true,
      data: { accessToken, refreshToken: rawRefreshToken, user: fresh.toJSON(), isNewUser },
    });
  } catch (err) {
    logAction({ req, action: "Email OTP login failed", file: "routes/auth.js:email_verify_otp", error: err });
    next(err);
  }
});

// --- Refresh token rotation & logout ---

router.post("/refresh", validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const tokenHash = hashToken(refreshToken);
    const db = getDb();
    const tokenDoc = await db.collection("refreshTokens").findOne({ tokenHash });

    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }

    if (tokenDoc.expiresAt < new Date()) {
      await db.collection("refreshTokens").deleteOne({ _id: tokenDoc._id });
      return res.status(401).json({
        success: false,
        error: "Refresh token expired",
      });
    }

    const tokens = await rotateRefreshToken(tokenDoc.userId, refreshToken);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (err) {
    if (err.code === "TOKEN_REVOKED") {
      return res.status(401).json({
        success: false,
        error: err.message,
        code: "TOKEN_REVOKED",
      });
    }
    next(err);
  }
});

router.post("/logout", authRequired, async (req, res, next) => {
  try {
    const count = await revokeAllRefreshTokens(req.userId);
    logAction({ req, action: "Logout", file: "routes/auth.js:logout" });
    res.json({
      success: true,
      data: { revokedSessions: count },
    });
  } catch (err) {
    logAction({ req, action: "Logout failed", file: "routes/auth.js:logout", error: err });
    next(err);
  }
});

router.post(
  "/register-token",
  authRequired,
  validate(registerFcmTokenSchema),
  async (req, res, next) => {
    try {
      const db = getDb();
      const { token, platform } = req.body;
      await db.collection("fcmTokens").updateOne(
        { token },
        {
          $set: {
            userId: req.userId,
            platform,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
