import { OAuth2Client } from "google-auth-library";

/** Public OAuth client IDs whose issued ID tokens the API will accept. */
export function getGoogleOAuthAudiences() {
  return [
    process.env.GOOGLE_OAUTH_WEB_CLIENT_ID,
    process.env.GOOGLE_OAUTH_IOS_CLIENT_ID,
    process.env.GOOGLE_OAUTH_ANDROID_CLIENT_ID,
    process.env.GOOGLE_OAUTH_EXPO_CLIENT_ID,
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
}

export function isGoogleAuthConfigured() {
  return getGoogleOAuthAudiences().length > 0;
}

/**
 * @param {string} idToken
 * @returns {Promise<{ sub: string, email: string, name: string, picture: string }>}
 */
export async function verifyGoogleIdToken(idToken) {
  const audiences = getGoogleOAuthAudiences();
  if (!audiences.length) {
    const err = new Error("Google sign-in is not configured on the server");
    err.code = "GOOGLE_NOT_CONFIGURED";
    throw err;
  }
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: audiences,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    const err = new Error("Invalid Google token");
    err.code = "GOOGLE_INVALID";
    throw err;
  }
  if (payload.email_verified !== true) {
    const err = new Error("Google email is not verified");
    err.code = "GOOGLE_EMAIL_UNVERIFIED";
    throw err;
  }
  return {
    sub: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    name: String(payload.name || payload.email.split("@")[0] || "User").slice(0, 80),
    picture: String(payload.picture || "").slice(0, 500),
  };
}
