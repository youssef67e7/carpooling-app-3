import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";

function readFirebaseConfig(extra = {}) {
  const apiKey =
    extra.firebaseApiKey ||
    (typeof process.env.EXPO_PUBLIC_FIREBASE_API_KEY === "string" ? process.env.EXPO_PUBLIC_FIREBASE_API_KEY : "");
  const authDomain =
    extra.firebaseAuthDomain ||
    (typeof process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN === "string"
      ? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
      : "");
  const projectId =
    extra.firebaseProjectId ||
    (typeof process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID === "string" ? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID : "");
  const storageBucket =
    extra.firebaseStorageBucket ||
    (typeof process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET === "string"
      ? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
      : "");
  const messagingSenderId =
    extra.firebaseMessagingSenderId ||
    (typeof process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID === "string"
      ? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      : "");
  const appId =
    extra.firebaseAppId ||
    (typeof process.env.EXPO_PUBLIC_FIREBASE_APP_ID === "string" ? process.env.EXPO_PUBLIC_FIREBASE_APP_ID : "");

  return {
    apiKey: String(apiKey || "").trim(),
    authDomain: String(authDomain || "").trim(),
    projectId: String(projectId || "").trim(),
    storageBucket: String(storageBucket || "").trim(),
    messagingSenderId: String(messagingSenderId || "").trim(),
    appId: String(appId || "").trim(),
  };
}

export function isFirebaseClientConfigured(extra = {}) {
  const c = readFirebaseConfig(extra);
  return Boolean(c.apiKey && c.projectId && c.appId);
}

function getFirebaseApp(extra = {}) {
  const config = readFirebaseConfig(extra);
  if (!isFirebaseClientConfigured(extra)) return null;
  const existing = getApps();
  if (existing.length) return existing[0];
  return initializeApp(config);
}

/**
 * Google ID token → Firebase Auth (Google provider) → Firebase ID token for API.
 */
export async function exchangeGoogleIdTokenForFirebase(googleIdToken, extra = {}) {
  const token = String(googleIdToken || "").trim();
  if (!token) return null;
  if (!isFirebaseClientConfigured(extra)) return token;

  const app = getFirebaseApp(extra);
  if (!app) return token;

  const auth = getAuth(app);
  const credential = GoogleAuthProvider.credential(token);
  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user.getIdToken();
}
