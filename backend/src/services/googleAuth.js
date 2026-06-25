import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

let cachedToken = null;
let expiresAt = 0;

export async function getAccessToken() {
  if (cachedToken && Date.now() < expiresAt) {
    return cachedToken;
  }

  const email = process.env.FCM_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.FCM_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) {
    console.error("[FCM] FCM_SERVICE_ACCOUNT_EMAIL or FCM_SERVICE_ACCOUNT_PRIVATE_KEY not set");
    return null;
  }

  const client = new JWT({
    email,
    key,
    scopes: SCOPES,
  });

  const { token } = await client.getAccessToken();
  cachedToken = token;
  expiresAt = Date.now() + 50 * 60 * 1000;

  return cachedToken;
}

export function getProjectId() {
  return process.env.FCM_PROJECT_ID || "";
}
