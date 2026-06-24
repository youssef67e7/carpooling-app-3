import { Router } from "express";
import { sendPhoneOtp, verifyPhoneOtp } from "../services/authNativeService.js";
import { verifyFirebasePhoneToken } from "../services/firebasePhoneService.js";

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
    return res.status(200).json({ success: true, data: { message: "OTP sent", code: result.code } });
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

router.post("/verify-firebase-phone", async (req, res) => {
  const { firebaseIdToken, name } = req.body;
  if (!firebaseIdToken) {
    return res.status(400).json(validationError("firebaseIdToken is required"));
  }
  try {
    const result = await verifyFirebasePhoneToken(firebaseIdToken, name);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    const msg = err.message || String(err);
    try {
      if (msg.includes("Invalid Firebase token")) {
        return res.status(401).json(authError(msg));
      }
      return res.status(500).json(internalError(msg));
    } catch (serializeErr) {
      return res.status(500).type("text").send("Server error: " + msg);
    }
  }
});

export default router;
