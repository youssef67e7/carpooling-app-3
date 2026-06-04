import { Platform, TurboModuleRegistry } from "react-native";

/** True when the dev/production APK includes @react-native-google-signin native code. */
export function isNativeGoogleSignInAvailable() {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return false;
  return TurboModuleRegistry.get("RNGoogleSignin") != null;
}

/** Lazy-load JS only if native module exists (avoids Red Screen on old builds). */
export function getNativeGoogleSignInModule() {
  if (!isNativeGoogleSignInAvailable()) return null;
  try {
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
}
