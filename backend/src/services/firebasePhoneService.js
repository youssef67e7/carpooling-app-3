import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { findByPhone, create } from "../mongo/queries/users.js";
import { signUserToken } from "../utils/signUserToken.js";
import { ObjectId } from "mongodb";

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;
  if (admin.apps.length) {
    firebaseInitialized = true;
    return;
  }
  const __dirname = dirname(fileURLToPath(import.meta.url));
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    const filePath = resolve(__dirname, "../../firebase-service-account.json");
    if (!existsSync(filePath)) {
      throw new Error("Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT env var or place firebase-service-account.json in backend/");
    }
    serviceAccount = JSON.parse(readFileSync(filePath, "utf8"));
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
}

export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
  try {
    initFirebase();
  } catch {
    throw new Error("Firebase is not configured on the server");
  }
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(firebaseIdToken);
  } catch {
    throw new Error("Invalid Firebase token");
  }

  const phoneNumber = decoded.phone_number;
  if (!phoneNumber) {
    throw new Error("Firebase token does not contain a phone number");
  }

  let user = await findByPhone(phoneNumber);
  let isNewUser = false;

  if (!user) {
    const userData = {
      phone: phoneNumber,
      role: "user",
      created_at: new Date(),
    };
    if (name && typeof name === "string" && name.trim()) {
      userData.name = name.trim();
    }
    const insertedId = await create(userData);
    user = await findByPhone(phoneNumber);
    isNewUser = true;
  }

  const token = signUserToken(user);
  return { token, user, isNewUser };
}