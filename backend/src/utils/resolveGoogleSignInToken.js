import { isGoogleAuthConfigured, verifyGoogleIdToken } from "./verifyGoogleIdToken.js";

/**
 * Verify Google OAuth ID token from the mobile app.
 * @returns {Promise<{ sub: string, email: string, name: string, picture: string, googleSub: string | null, provider: "google" }>}
 */
export async function resolveGoogleSignInToken(idToken) {
  const token = String(idToken || "").trim();
  if (!token) {
    const err = new Error("Missing token");
    err.code = "TOKEN_MISSING";
    throw err;
  }

  if (!isGoogleAuthConfigured()) {
    const err = new Error("Google sign-in is not configured on the server");
    err.code = "AUTH_NOT_CONFIGURED";
    throw err;
  }

  const g = await verifyGoogleIdToken(token);
  return { ...g, provider: "google", googleSub: g.sub };
}

export function isGoogleOrFirebaseSignInConfigured() {
  return isGoogleAuthConfigured();
}

/** @deprecated use isGoogleOrFirebaseSignInConfigured */
export const isGoogleSignInConfigured = isGoogleOrFirebaseSignInConfigured;
