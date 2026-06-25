import { JWT } from "google-auth-library";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

let cachedToken = null;
let expiresAt = 0;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, "../../firebase-service-account.json");

function loadServiceAccount() {
  const email = process.env.FCM_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.FCM_SERVICE_ACCOUNT_PRIVATE_KEY;
  const projectId = process.env.FCM_PROJECT_ID;

  if (email && key && projectId) {
    return { email, key, projectId };
  }

  try {
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      const raw = fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8");
      const parsed = JSON.parse(raw);
      return {
        email: parsed.client_email,
        key: parsed.private_key,
        projectId: parsed.project_id,
      };
    }
  } catch (err) {
    console.error("[FCM] Failed to read firebase-service-account.json:", err.message);
  }

  return { email: null, key: null, projectId: null };
}

const account = loadServiceAccount();

export async function getAccessToken() {
  if (cachedToken && Date.now() < expiresAt) {
    return cachedToken;
  }

  if (!account.email || !account.key) {
    console.error("[FCM] No Firebase service account credentials available");
    return null;
  }

  const client = new JWT({
    email: account.email,
    key: account.key,
    scopes: SCOPES,
  });

  const { token } = await client.getAccessToken();
  cachedToken = token;
  expiresAt = Date.now() + 50 * 60 * 1000;

  return cachedToken;
}

export function getProjectId() {
  return account.projectId || process.env.FCM_PROJECT_ID || "";
}
