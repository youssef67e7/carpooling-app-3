import { Router } from "express";
import { sendPhoneOtp, verifyPhoneOtp } from "../services/authNativeService.js";

const router = Router();

function validationError(message) {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
}

function authError(message) {
  return { success: false, error: { code: "AUTH_ERROR", message } };
}

function internalError(message) {
  return { success: false, error: { code: "INTERNAL_ERROR", message } };
}

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json(validationError("Phone is required"));
    }

    const result = await sendPhoneOtp(phone);
    const data = { message: "OTP sent" };
    if (process.env.NODE_ENV !== "production") {
      data._devOtp = result.code;
    }
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json(internalError(err.message));
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json(validationError("Phone and code are required"));
    }

    const result = await verifyPhoneOtp(phone, code);
    return res.status(200).json({
      success: true,
      data: { token: result.token, user: result.user, isNewUser: result.isNewUser },
    });
  } catch (err) {
    const msg = err.message;
    if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("not found")) {
      return res.status(400).json(authError(msg));
    }
    if (msg.toLowerCase().includes("attempts") || msg.toLowerCase().includes("invalid")) {
      return res.status(401).json(authError(msg));
    }
    return res.status(500).json(internalError(msg));
  }
});

export default router;
