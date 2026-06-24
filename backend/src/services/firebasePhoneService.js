import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { findByPhone, create } from "../mongo/queries/users.js";
import { signUserToken } from "../utils/signUserToken.js";

let ready = false;

function init() {
  if (ready) return;
  if (admin.apps.length) { ready = true; return; }
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const fp = resolve(__dirname, "../../firebase-service-account.json");
      if (!existsSync(fp)) { console.warn("[firebase] No credentials"); return; }
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(fp, "utf8"))) });
    } else {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    }
    ready = true;
  } catch (err) { console.warn("[firebase] init failed:", err.message); }
}

init();

export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
  if (!ready) throw new Error("Firebase is not configured");
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(firebaseIdToken); }
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