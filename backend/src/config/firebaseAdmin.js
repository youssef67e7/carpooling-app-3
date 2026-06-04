import fs from "fs";
import path from "path";
import admin from "firebase-admin";

let initialized = false;

function readServiceAccountFile() {
  const credPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  if (!credPath) return null;
  try {
    const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return null;
  }
}

export function resolveFirebaseProjectId() {
  const fromEnv = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  if (fromEnv) return fromEnv;
  const sa = readServiceAccountFile();
  return String(sa?.project_id || "").trim();
}

export function isFirebaseAdminConfigured() {
  if (String(process.env.FIREBASE_CLIENT_EMAIL || "").trim() && String(process.env.FIREBASE_PRIVATE_KEY || "").trim()) {
    return Boolean(resolveFirebaseProjectId());
  }
  if (String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim()) {
    return Boolean(resolveFirebaseProjectId());
  }
  return false;
}

/** @returns {import("firebase-admin").app.App | null} */
export function getFirebaseAdminApp() {
  if (!isFirebaseAdminConfigured()) return null;
  if (initialized && admin.apps.length) {
    return admin.app();
  }

  const projectId = resolveFirebaseProjectId();
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: String(process.env.FIREBASE_CLIENT_EMAIL).trim(),
        privateKey: String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n"),
      }),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId || undefined,
    });
  }
  initialized = true;
  return admin.app();
}
