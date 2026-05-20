/**
 * Prints redirect URIs to register in Google Cloud Console.
 * Run: node scripts/print-google-oauth.js
 */
const scheme = "weret";
const androidPackage = "com.ridehail.app";

console.log("\n=== WERET Google OAuth redirect URIs ===\n");
console.log("Add these to Google Cloud → OAuth 2.0 Client (Web) → Authorized redirect URIs:\n");
console.log(`  ${scheme}:/oauthredirect`);
console.log(`  ${androidPackage}:/oauthredirect`);
console.log("\nBackend (backend/.env):");
console.log("  GOOGLE_OAUTH_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com");
console.log("  GOOGLE_OAUTH_ANDROID_CLIENT_ID=<android-client-id>.apps.googleusercontent.com");
console.log("\nMobile (mobile/.env):");
console.log("  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<same web client id>");
console.log("  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android client id>");
console.log("\nVerify API: GET http://localhost:3000/auth/google-config → enabled: true\n");
