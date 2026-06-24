import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { findByPhone, create } from "../mongo/queries/users.js";
import { signUserToken } from "../utils/signUserToken.js";

let admin = null;
let ready = false;

async function init() {
  if (ready) return;
  try {
    admin = await import("firebase-admin");
  } catch (e) {
    console.warn("[firebase] package not available:", e.message);
    return;
  }
  if (admin.default.apps.length) { ready = true; return; }
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const fp = resolve(__dirname, "../../firebase-service-account.json");
      if (!existsSync(fp)) { console.warn("[firebase] No credentials file"); return; }
      const sa = JSON.parse(readFileSync(fp, "utf8"));
      admin.default.initializeApp({ credential: admin.default.credential.cert(sa) });
    } else {
      admin.default.initializeApp({ credential: admin.default.credential.cert(JSON.parse(raw)) });
    }
    ready = true;
  } catch (err) { console.warn("[firebase] init failed:", err.message); }
}

export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
  if (!ready) {
    await init();
    if (!ready) throw new Error("Firebase is not configured");
  }
  let decoded;
  try { decoded = await admin.default.auth().verifyIdToken(firebaseIdToken); }
  catch { throw new Error("Invalid Firebase token"); }
  const phoneNumber = decoded.phone_number;
  if (!phoneNumber) throw new Error("Firebase token does not contain a phone number");
  let user = await findByPhone(phoneNumber);
  let isNewUser = false;
  if (!user) {
    const userData = { phone: phoneNumber, role: "user", created_at: new Date() };
    if (name && typeof name === "string" && name.trim()) userData.name = name.trim();
    await create(userData);
    user = await findByPhone(phoneNumber);
    isNewUser = true;
  }
  const token = signUserToken(user);
  return { token, user, isNewUser };
}