import { findByPhone, findByGoogleSub, create, findById } from "../mongo/queries/users.js";
import { createOtp, findOtp, incrementAttempts } from "../mongo/queries/otps.js";
import { randomPhoneOtp6, hashPhoneOtp } from "../utils/phoneOtp.js";
import { signUserToken } from "../utils/signUserToken.js";
import { generateRefreshToken, storeRefreshToken } from "./refreshTokenService.js";

/**
 * Generates and stores a phone OTP.
 * @param {string} phone
 * @returns {Promise<{ success: boolean, code: string }>}
 */
export async function sendPhoneOtp(phone) {
  const code = randomPhoneOtp6();
  const hash = hashPhoneOtp(code);
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  await createOtp(phone, hash, expiry);

  return { success: true, code };
}

/**
 * Verifies a phone OTP, creates or finds the user, and returns a JWT.
 * @param {string} phone
 * @param {string} codeInput
 * @returns {Promise<{ token: string, user: object, isNewUser: boolean }>}
 */
export async function verifyPhoneOtp(phone, codeInput) {
  const otp = await findOtp(phone);
  if (!otp) {
    throw new Error("OTP not found or expired");
  }

  if (otp.attempts >= 3) {
    throw new Error("Too many attempts");
  }

  const expectedHash = hashPhoneOtp(codeInput);
  if (expectedHash !== otp.code) {
    await incrementAttempts(otp._id);
    throw new Error("Invalid OTP");
  }

  let user = await findByPhone(phone);
  let isNewUser = false;

  if (!user) {
    const insertedId = await create({
      phone,
      role: "user",
      created_at: new Date(),
    });
    user = await findByPhone(phone);
    isNewUser = true;
  }

  const accessToken = signUserToken(user);
  const rawRefreshToken = generateRefreshToken();
  await storeRefreshToken(user._id, rawRefreshToken);
  return { accessToken, refreshToken: rawRefreshToken, user, isNewUser };
}
