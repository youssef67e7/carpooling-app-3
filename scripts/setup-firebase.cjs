#!/usr/bin/env node
/**
 * Reads Firebase files and writes mobile/.env + backend/.env
 *
 * Place files from Firebase Console:
 *   mobile/google-services.json
 *   backend/firebase-service-account.json
 *
 * Then: npm run setup:firebase
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const mobileEnvPath = path.join(root, "mobile", ".env");
const backendEnvPath = path.join(root, "backend", ".env");
const googleServicesPath = path.join(root, "mobile", "google-services.json");
const serviceAccountPath = path.join(root, "backend", "firebase-service-account.json");
const androidGoogleServicesDest = path.join(root, "mobile", "android", "app", "google-services.json");

function upsertEnvFile(filePath, updates) {
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").split(/\r?\n/) : [];
  const keys = new Set(Object.keys(updates));
  const out = [];
  const seen = new Set();

  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (m && keys.has(m[1])) {
      out.push(`${m[1]}=${updates[m[1]]}`);
      seen.add(m[1]);
    } else {
      out.push(line);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) out.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, out.filter((l, i, a) => !(i === a.length - 1 && l === "")).join("\n") + "\n");
}

function mobileEnvFromGoogleServices(json) {
  const pi = json.project_info || {};
  const client =
    json.client?.find((c) => c.client_info?.android_client_info?.package_name === "com.ridehail.app") ||
    json.client?.[0];
  if (!client) throw new Error("google-services.json: no client block found");

  const apiKey = client.api_key?.[0]?.current_key || "";
  const appId = client.client_info?.mobilesdk_app_id || "";
  const oauth = client.oauth_client || [];
  const web = oauth.find((o) => o.client_type === 3)?.client_id || "";
  const android = oauth.find((o) => o.client_type === 1)?.client_id || "";

  if (!pi.project_id || !apiKey || !appId) {
    throw new Error("google-services.json: missing project_id, api_key, or mobilesdk_app_id");
  }

  return {
    EXPO_PUBLIC_FIREBASE_API_KEY: apiKey,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${pi.project_id}.firebaseapp.com`,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: pi.project_id,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: pi.storage_bucket || `${pi.project_id}.appspot.com`,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: String(pi.project_number || ""),
    EXPO_PUBLIC_FIREBASE_APP_ID: appId,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: web,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: android,
  };
}

function backendEnvFromServiceAccount(json, relPath) {
  if (!json.project_id || !json.client_email) {
    throw new Error("firebase-service-account.json: invalid service account file");
  }
  return {
    FIREBASE_PROJECT_ID: json.project_id,
    GOOGLE_APPLICATION_CREDENTIALS: relPath.replace(/\\/g, "/"),
  };
}

function main() {
  let ok = false;

  if (fs.existsSync(googleServicesPath)) {
    const json = JSON.parse(fs.readFileSync(googleServicesPath, "utf8"));
    const mobileUpdates = mobileEnvFromGoogleServices(json);
    upsertEnvFile(mobileEnvPath, mobileUpdates);

    if (fs.existsSync(path.dirname(androidGoogleServicesDest))) {
      fs.copyFileSync(googleServicesPath, androidGoogleServicesDest);
    }

    console.log("✓ mobile/.env updated from google-services.json");
    console.log("  project:", mobileUpdates.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
    ok = true;
  } else {
    console.log("✗ missing mobile/google-services.json");
    console.log("  Firebase → Project settings → Your apps → Android → Download google-services.json");
  }

  if (fs.existsSync(serviceAccountPath)) {
    const json = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    const rel = "./firebase-service-account.json";
    const backendUpdates = backendEnvFromServiceAccount(json, rel);
    upsertEnvFile(backendEnvPath, backendUpdates);
    console.log("✓ backend/.env updated from firebase-service-account.json");
    console.log("  project:", backendUpdates.FIREBASE_PROJECT_ID);
    ok = true;
  } else {
    console.log("✗ missing backend/firebase-service-account.json");
    console.log("  Firebase → Project settings → Service accounts → Generate new private key");
  }

  if (!ok) {
    console.log("\nAfter adding both JSON files, run again: npm run setup:firebase");
    process.exit(1);
  }

  console.log("\nNext: restart backend + Expo (r), then npm run android:google");
}

main();
