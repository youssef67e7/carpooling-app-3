import { AppError } from "../errors/AppError.js";

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim()
  );
}

async function sendViaTwilio(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID.trim();
  const token = process.env.TWILIO_AUTH_TOKEN.trim();
  const from = process.env.TWILIO_FROM_NUMBER.trim();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    console.error("[sms] Twilio error:", res.status, detail);
    throw new AppError("Could not send SMS. Check Twilio number and account.", 502);
  }
  return { provider: "twilio", sent: true };
}

/**
 * Send SMS. Twilio when TWILIO_* env vars are set; otherwise console log in dev.
 * @returns {{ provider: string, sent: boolean, dev?: boolean }}
 */
export async function sendSms({ to, body }) {
  if (!to || !body) throw new AppError("SMS destination and body required", 400);

  if (twilioConfigured()) {
    return sendViaTwilio(to, body);
  }

  const allowConsole =
    process.env.SMS_CONSOLE_MODE === "1" ||
    process.env.NODE_ENV !== "production" ||
    process.env.NODE_ENV == null;

  if (allowConsole) {
    console.log(`[sms] (console — no Twilio) To ${to}: ${body}`);
    return { provider: "console", sent: false, dev: true };
  }

  throw new AppError(
    "SMS is not configured on the server. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
    503
  );
}

export function buildLoginOtpMessage(otp) {
  const app = process.env.APP_NAME || "WERET";
  const ar = process.env.SMS_OTP_LANG === "ar";
  if (ar) {
    return `رمز ${app}: ${otp}\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.`;
  }
  return `${app} verification code: ${otp}\nValid for 10 minutes. Do not share this code.`;
}
