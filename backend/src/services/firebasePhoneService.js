import { findByPhone, create } from "../mongo/queries/users.js";
import { signUserToken } from "../utils/signUserToken.js";

let admin = null;
let ready = false;

async function init() {
  if (ready) return;
  try {
    const mod = await import("firebase-admin");
    admin = mod.default || mod;
    if (admin.apps && admin.apps.length) { ready = true; return; }
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) { console.warn("[firebase] FIREBASE_SERVICE_ACCOUNT not set"); return; }
    const sa = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    ready = true;
  } catch (err) {
    console.warn("[firebase] init error:", err?.message || err);
  }
}

export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
  if (!ready) {
    await init();
    if (!ready) throw new Error("Firebase is not configured on this server");
  }
  if (!firebaseIdToken || typeof firebaseIdToken !== "string") {
    throw new Error("Invalid Firebase token");
  }
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