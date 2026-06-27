import crypto from "crypto";

function getOtpSecret() {
  const secret = process.env.EMAIL_OTP_SECRET || process.env.WITHDRAW_OTP_SECRET;
  if (!secret) throw new Error("EMAIL_OTP_SECRET or WITHDRAW_OTP_SECRET must be set");
  return secret;
}

export function hashEmailOtp(otp) {
  return crypto.createHash("sha256").update(`${otp}:${getOtpSecret()}`).digest("hex");
}

export function randomEmailOtp6() {
  return String(crypto.randomInt(100000, 1000000));
}
