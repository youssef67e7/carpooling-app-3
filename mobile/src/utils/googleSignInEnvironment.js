import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function isNativeBuild() {
  return [ExecutionEnvironment.Bare, ExecutionEnvironment.Standalone].includes(
    Constants.executionEnvironment
  );
}

export function androidPackageName() {
  return Constants.expoConfig?.android?.package || "com.ridehail.app";
}

/** Redirect Google accepts on installed Android/iOS builds (not Expo Go). */
export function getGoogleOAuthRedirectUri() {
  if (!isNativeBuild()) return null;
  if (Platform.OS === "android") {
    return `${androidPackageName()}:/oauthredirect`;
  }
  if (Platform.OS === "ios") {
    const bundle = Constants.expoConfig?.ios?.bundleIdentifier || "com.ridehail.app";
    return `${bundle}:/oauthredirect`;
  }
  return null;
}

/** Package redirect works on dev client / release APK — not Expo Go (exp:// → Google 400). */
export function canUsePackageRedirect() {
  if (Platform.OS === "web") return false;
  return !isExpoGo();
}

/** Browser OAuth with com.ridehail.app:/oauthredirect */
export function canUseBrowserGoogleOAuth() {
  if (Platform.OS === "web") return true;
  return canUsePackageRedirect() && Boolean(getGoogleOAuthRedirectUri());
}
