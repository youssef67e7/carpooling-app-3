import crypto from "crypto";

const OTP_SECRET =
  process.env.EMAIL_OTP_SECRET || process.env.PHONE_OTP_SECRET || process.env.WITHDRAW_OTP_SECRET || "dev-email-otp-secret-change-me";

export function hashEmailOtp(otp) {
  return crypto.createHash("sha256").update(`${otp}:${OTP_SECRET}`).digest("hex");
}

export function randomEmailOtp6() {
  return String(crypto.randomInt(100000, 1000000));
}
