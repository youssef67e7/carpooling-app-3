import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { findByPhone, create } from "../mongo/queries/users.js";
import { signUserToken } from "../utils/signUserToken.js";
import { ObjectId } from "mongodb";

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;
  try {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } else {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      credential = admin.credential.cert(resolve(__dirname, "../../firebase-service-account.json"));
    }
    if (!admin.apps.length) {
      admin.initializeApp({ credential });
    }
    firebaseInitialized = true;
  } catch (err) {
    console.error("Firebase Admin init failed:", err.message);
    throw new Error("Firebase configuration is missing or invalid.");
  }
}

initializeFirebase();

export async function verifyFirebasePhoneToken(firebaseIdToken, name) {
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