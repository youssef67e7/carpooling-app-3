import nodemailer from "nodemailer";
import { AppError } from "../errors/AppError.js";

let _transporter = null;

function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (host && user && pass) {
    if (!_transporter) {
      _transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
    return _transporter;
  }
  return null;
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    throw new AppError("Email destination, subject, and body required", 400);
  }

  const transporter = getTransporter();

  if (transporter) {
    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@weret.app";
      await transporter.sendMail({ from, to, subject, text, html });
      return { provider: "smtp", sent: true };
    } catch (err) {
      console.error("[email] SMTP error:", err.message);
      throw new AppError("Failed to send email", 502);
    }
  }

  const allowConsole =
    process.env.EMAIL_CONSOLE_MODE === "1" ||
    process.env.NODE_ENV !== "production" ||
    process.env.NODE_ENV == null;

  if (allowConsole) {
    console.log(`[email] (console — no SMTP) To ${to}: ${subject} — ${text}`);
    return { provider: "console", sent: false, dev: true };
  }

  throw new AppError(
    "Email is not configured on the server. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
    503
  );
}
