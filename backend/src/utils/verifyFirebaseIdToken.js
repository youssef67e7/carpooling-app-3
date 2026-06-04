import { getFirebaseAdminApp, isFirebaseAdminConfigured } from "../config/firebaseAdmin.js";

/**
 * Verify Firebase Auth ID token (from Firebase Google sign-in on the app).
 * @param {string} idToken
 * @returns {Promise<{ sub: string, email: string, name: string, picture: string, googleSub: string | null }>}
 */
export async function verifyFirebaseIdToken(idToken) {
  if (!isFirebaseAdminConfigured()) {
    const err = new Error("Firebase Auth is not configured on the server");
    err.code = "FIREBASE_NOT_CONFIGURED";
    throw err;
  }
  const app = getFirebaseAdminApp();
  if (!app) {
    const err = new Error("Firebase Admin failed to initialize");
    err.code = "FIREBASE_NOT_CONFIGURED";
    throw err;
  }

  const decoded = await app.auth().verifyIdToken(idToken);
  if (!decoded?.uid || !decoded.email) {
    const err = new Error("Invalid Firebase token");
    err.code = "FIREBASE_INVALID";
    throw err;
  }
  if (decoded.email_verified === false) {
    const err = new Error("Firebase email is not verified");
    err.code = "FIREBASE_EMAIL_UNVERIFIED";
    throw err;
  }

  const googleSub =
    decoded.firebase?.identities?.["google.com"]?.[0] != null
      ? String(decoded.firebase.identities["google.com"][0])
      : null;

  return {
    sub: String(decoded.uid),
    email: String(decoded.email).trim().toLowerCase(),
    name: String(decoded.name || decoded.email.split("@")[0] || "User").slice(0, 80),
    picture: String(decoded.picture || "").slice(0, 500),
    googleSub,
  };
}
