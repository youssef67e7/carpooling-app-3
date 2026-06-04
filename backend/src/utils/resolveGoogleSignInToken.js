import { isFirebaseAdminConfigured } from "../config/firebaseAdmin.js";
import { verifyFirebaseIdToken } from "./verifyFirebaseIdToken.js";
import { isGoogleAuthConfigured, verifyGoogleIdToken } from "./verifyGoogleIdToken.js";

function looksLikeFirebaseJwt(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return false;
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    const iss = String(payload?.iss || "");
    return iss.includes("securetoken.google.com") || iss.includes("firebase");
  } catch {
    return false;
  }
}

/**
 * Accept Firebase ID token (preferred when configured) or raw Google OAuth ID token.
 * @returns {Promise<{ sub: string, email: string, name: string, picture: string, googleSub: string | null, provider: "firebase" | "google" }>}
 */
export async function resolveGoogleSignInToken(idToken) {
  const token = String(idToken || "").trim();
  if (!token) {
    const err = new Error("Missing token");
    err.code = "TOKEN_MISSING";
    throw err;
  }

  const tryFirebase = isFirebaseAdminConfigured() && looksLikeFirebaseJwt(token);
  const tryGoogle = isGoogleAuthConfigured();

  if (tryFirebase) {
    try {
      const g = await verifyFirebaseIdToken(token);
      return { ...g, provider: "firebase" };
    } catch (e) {
      if (!tryGoogle) throw e;
    }
  }

  if (tryGoogle) {
    const g = await verifyGoogleIdToken(token);
    return { ...g, provider: "google", googleSub: g.sub };
  }

  const err = new Error("Google / Firebase sign-in is not configured on the server");
  err.code = "AUTH_NOT_CONFIGURED";
  throw err;
}

export function isGoogleOrFirebaseSignInConfigured() {
  return isFirebaseAdminConfigured() || isGoogleAuthConfigured();
}
