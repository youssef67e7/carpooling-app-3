import { useCallback, useMemo } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

/**
 * Google ID token for POST /auth/google. Requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and optional native client IDs).
 */
export function useWeretGoogleIdToken() {
  const extra = Constants.expoConfig?.extra ?? {};
  const web =
    extra.googleWebClientId ||
    (typeof process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID === "string"
      ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      : "");
  const ios =
    extra.googleIosClientId ||
    (typeof process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID === "string"
      ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : "");
  const android =
    extra.googleAndroidClientId ||
    (typeof process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID === "string"
      ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
      : "");

  const requestConfig = useMemo(() => {
    const w = String(web || "").trim();
    if (!w) {
      return { clientId: "000000000000-0000000000000000000000000000000.apps.googleusercontent.com" };
    }
    return {
      clientId: w,
      iosClientId: String(ios || "").trim() || undefined,
      androidClientId: String(android || "").trim() || undefined,
    };
  }, [web, ios, android]);

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(requestConfig);

  const signIn = useCallback(async () => {
    const w = String(web || "").trim();
    if (!w) {
      return { ok: false, reason: "not_configured" };
    }
    const result = await promptAsync();
    if (result?.type !== "success") {
      return {
        ok: false,
        reason: result?.type === "cancel" ? "cancelled" : "dismissed",
      };
    }
    const idToken =
      result.params?.id_token ||
      (result.authentication && result.authentication.idToken) ||
      null;
    if (!idToken) {
      return { ok: false, reason: "no_token" };
    }
    return { ok: true, idToken };
  }, [promptAsync, web]);

  return {
    signIn,
    ready: Boolean(request),
    configured: Boolean(String(web || "").trim()),
  };
}
