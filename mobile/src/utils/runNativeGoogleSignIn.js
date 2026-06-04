import { Platform } from "react-native";
import { getNativeGoogleSignInModule, isNativeGoogleSignInAvailable } from "./nativeGoogleSignIn";

/**
 * Native Google Sign-In (needs dev/release APK with RNGoogleSignin).
 * @returns {{ ok: true, idToken: string } | { ok: false, cancelled?: boolean, code?: string }}
 */
export async function runNativeGoogleSignIn({ webClientId, iosClientId }) {
  if (!isNativeGoogleSignInAvailable()) {
    return { ok: false };
  }
  const mod = getNativeGoogleSignInModule();
  if (!mod?.GoogleSignin) {
    return { ok: false };
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = mod;
  const web = String(webClientId || "").trim();
  if (!web) {
    return { ok: false };
  }

  try {
    GoogleSignin.configure({
      webClientId: web,
      iosClientId: Platform.OS === "ios" && iosClientId ? iosClientId : undefined,
      offlineAccess: false,
    });
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result)) {
      return { ok: false, cancelled: true };
    }
    let idToken = result.data?.idToken;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens?.idToken;
    }
    if (!idToken) {
      return { ok: false };
    }
    return { ok: true, idToken };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) {
        return { ok: false, cancelled: true };
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { ok: false, code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE };
      }
      if (String(e.code) === "10" || String(e.message || "").includes("DEVELOPER_ERROR")) {
        return { ok: false, code: "DEVELOPER_ERROR" };
      }
      return { ok: false, code: String(e.code) };
    }
    return { ok: false };
  }
}
