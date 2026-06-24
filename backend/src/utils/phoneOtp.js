import crypto from "crypto";

const OTP_SECRET = process.env.PHONE_OTP_SECRET || process.env.WITHDRAW_OTP_SECRET || "dev-phone-otp-secret-change-me";

export function normalizePhone(raw) {
  let s = String(raw || "").trim().replace(/[\s\-().]/g, "");
  if (!s) return "";
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) {
    if (/^01[0-9]{9}$/.test(s)) s = `+20${s.slice(1)}`;
    else if (/^0[5-9][0-9]{8}$/.test(s)) s = `+966${s.slice(1)}`;
    else if (/^[0-9]{10,15}$/.test(s)) s = `+${s}`;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return "";
  return `+${digits}`;
}

export function hashPhoneOtp(otp) {
  return crypto.createHash("sha256").update(`${otp}:${OTP_SECRET}`).digest("hex");
}

export function randomPhoneOtp6() {
  return String(crypto.randomInt(100000, 1000000));
}

export function syntheticEmailForPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return `phone_${digits}@weret.local`;
}
