import { useEffect, useCallback, useState, useRef } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { googleSignInThunk, clearError } from "../store/slices/authSlice";
import { showAlert } from "../utils/showAlert";
import { formatGoogleOAuthError } from "../utils/googleOAuthErrors";
import { isNativeGoogleSignInAvailable } from "../utils/nativeGoogleSignIn";
import { runNativeGoogleSignIn } from "../utils/runNativeGoogleSignIn";
import {
  canUseBrowserGoogleOAuth,
  getGoogleOAuthRedirectUri,
  isExpoGo,
} from "../utils/googleSignInEnvironment";
import { exchangeGoogleIdTokenForFirebase, isFirebaseClientConfigured } from "../config/firebase";

WebBrowser.maybeCompleteAuthSession();

function readGoogleIds(extra) {
  const web = String(
    extra.googleWebClientId ||
      (typeof process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID === "string"
        ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
        : "") ||
      ""
  ).trim();
  const ios = String(
    extra.googleIosClientId ||
      (typeof process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID === "string"
        ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
        : "") ||
      ""
  ).trim();
  const android = String(
    extra.googleAndroidClientId ||
      (typeof process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID === "string"
        ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
        : "") ||
      ""
  ).trim();
  return { web, ios, android };
}

function nativeApplicationId() {
  return (
    Constants.expoConfig?.android?.package ||
    Constants.expoConfig?.ios?.bundleIdentifier ||
    "com.ridehail.app"
  );
}

function extractIdTokenFromAuthResult(result) {
  if (!result || result.type !== "success") return "";
  return (
    result.params?.id_token ||
    result.authentication?.idToken ||
    result.authentication?.id_token ||
    ""
  );
}

/**
 * Google Sign-In for WERET — wired to LoginScreen «Continue with Google».
 * 1) Native SDK (dev/release APK) → idToken → POST /auth/google
 * 2) OAuth browser (package redirect com.ridehail.app:/oauthredirect)
 */
export function useWeretGoogleSignIn() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
  const local = readGoogleIds(extra);
  const [remote, setRemote] = useState({ status: "idle" });
  const [signingIn, setSigningIn] = useState(false);
  const oauthHandledRef = useRef(false);
  const appId = nativeApplicationId();
  const googleLang = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const hasNativeModule = isNativeGoogleSignInAvailable();

  useEffect(() => {
    let alive = true;
    api
      .get("/auth/google-config")
      .then(({ data }) => {
        if (!alive || !data) return;
        setRemote({
          status: "ok",
          enabled: Boolean(data.enabled),
          webClientId: String(data.webClientId || "").trim(),
          iosClientId: String(data.iosClientId || "").trim(),
          androidClientId: String(data.androidClientId || "").trim(),
        });
      })
      .catch(() => {
        if (alive) setRemote({ status: "error" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const web = local.web || (remote.status === "ok" ? remote.webClientId : "") || "";
  const ios = local.ios || (remote.status === "ok" ? remote.iosClientId : "") || web;
  const android = local.android || (remote.status === "ok" ? remote.androidClientId : "") || "";
  const oauthRedirectUri = getGoogleOAuthRedirectUri() || `${appId}:/oauthredirect`;
  const packageOAuthOk = canUseBrowserGoogleOAuth();

  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      webClientId: web,
      iosClientId: Platform.OS === "ios" ? ios || web : undefined,
      androidClientId: Platform.OS === "android" ? android || undefined : undefined,
      redirectUri: packageOAuthOk ? oauthRedirectUri : undefined,
      language: googleLang,
      selectAccount: true,
    },
    { path: "oauthredirect" }
  );

  const redirectUri = request?.redirectUri || oauthRedirectUri;

  const finishGoogleSignIn = useCallback(
    async (googleIdToken) => {
      if (!googleIdToken) {
        showAlert(t("weretGoogleErrorTitle"), t("weretGoogleNoIdToken"), [{ text: "OK" }]);
        return;
      }
      let apiToken = googleIdToken;
      if (isFirebaseClientConfigured(extra)) {
        try {
          apiToken = await exchangeGoogleIdTokenForFirebase(googleIdToken, extra);
        } catch (e) {
          if (__DEV__) console.warn("[Firebase] link failed, using Google token", e);
          apiToken = googleIdToken;
        }
      }
      const action = await dispatch(googleSignInThunk(apiToken));
      if (googleSignInThunk.rejected.match(action)) {
        showAlert(
          t("weretGoogleErrorTitle"),
          formatGoogleOAuthError(action.payload, t, redirectUri),
          [{ text: "OK" }]
        );
      }
    },
    [dispatch, t, redirectUri, extra]
  );

  const handleOAuthSuccess = useCallback(
    async (result) => {
      const idToken = extractIdTokenFromAuthResult(result);
      if (!idToken) return false;
      if (oauthHandledRef.current) return true;
      oauthHandledRef.current = true;
      await finishGoogleSignIn(idToken);
      return true;
    },
    [finishGoogleSignIn]
  );

  useEffect(() => {
    if (__DEV__) {
      console.log("[Google] expoGo:", isExpoGo(), "nativeModule:", hasNativeModule);
      console.log("[Google] web:", Boolean(web), "android:", Boolean(android));
      if (request?.redirectUri) console.log("[Google] redirectUri:", request.redirectUri);
    }
  }, [hasNativeModule, web, android, request?.redirectUri]);

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      handleOAuthSuccess(response).finally(() => setSigningIn(false));
      return;
    }
    if (response.type === "error") {
      setSigningIn(false);
      const raw =
        response.params?.error_description ||
        response.params?.error ||
        response.error?.message ||
        response.error?.code;
      showAlert(t("weretGoogleErrorTitle"), formatGoogleOAuthError(raw, t, redirectUri), [{ text: "OK" }]);
    }
  }, [response, handleOAuthSuccess, t, redirectUri]);

  const signInNative = useCallback(async () => {
    dispatch(clearError());
    const result = await runNativeGoogleSignIn({ webClientId: web, iosClientId: ios });
    if (result.ok) {
      await finishGoogleSignIn(result.idToken);
      return true;
    }
    if (result.cancelled) return true;
    if (result.code === "PLAY_SERVICES_NOT_AVAILABLE") {
      showAlert(t("weretGoogleErrorTitle"), t("weretGooglePlayServices"), [{ text: "OK" }]);
      return true;
    }
    if (result.code === "DEVELOPER_ERROR") {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleDeveloperError"), [{ text: "OK" }]);
      return true;
    }
    return false;
  }, [dispatch, web, ios, finishGoogleSignIn, t]);

  const signInOAuth = useCallback(async () => {
    if (!packageOAuthOk) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleExpoGoBlocked"), [{ text: "OK" }]);
      return;
    }
    if (!request) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleInitializing"), [{ text: "OK" }]);
      return;
    }
    if (Platform.OS === "android" && !android) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleSetupSteps"), [{ text: "OK" }]);
      return;
    }
    dispatch(clearError());
    oauthHandledRef.current = false;
    try {
      await WebBrowser.warmUpAsync();
    } catch {
      /* optional */
    }
    const result = await promptAsync({ showInRecents: true });
    if (result?.type === "dismiss" || result?.type === "cancel") {
      setSigningIn(false);
      return;
    }
    if (result?.type === "error") {
      setSigningIn(false);
      const raw = result.params?.error_description || result.params?.error || result.error?.message;
      showAlert(t("weretGoogleErrorTitle"), formatGoogleOAuthError(raw, t, redirectUri), [{ text: "OK" }]);
      return;
    }
    if (result?.type === "success") {
      const handled = await handleOAuthSuccess(result);
      if (!handled) {
        showAlert(t("weretGoogleErrorTitle"), t("weretGoogleNoIdToken"), [{ text: "OK" }]);
      }
      setSigningIn(false);
    }
  }, [
    packageOAuthOk,
    request,
    android,
    dispatch,
    promptAsync,
    t,
    redirectUri,
    handleOAuthSuccess,
  ]);

  const signIn = useCallback(async () => {
    if (signingIn) return;
    setSigningIn(true);
    oauthHandledRef.current = false;
    try {
      if (remote.status === "ok" && remote.enabled === false) {
        showAlert(t("weretGoogleErrorTitle"), t("weretGoogleServerDisabled"), [{ text: "OK" }]);
        return;
      }
      if (!web) {
        showAlert(t("weretGoogleErrorTitle"), t("weretGoogleSetupSteps"), [{ text: "OK" }]);
        return;
      }
      if (Platform.OS === "android" && !android) {
        showAlert(t("weretGoogleErrorTitle"), t("weretGoogleSetupSteps"), [{ text: "OK" }]);
        return;
      }

      if (hasNativeModule) {
        const nativeOk = await signInNative();
        if (nativeOk) return;
      }

      await signInOAuth();
    } catch (e) {
      if (__DEV__) console.warn("[Google] signIn error", e);
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleErrorBody"), [{ text: "OK" }]);
    } finally {
      setSigningIn(false);
    }
  }, [signingIn, web, android, remote, hasNativeModule, signInNative, signInOAuth, t]);

  const configured =
    Boolean(web) &&
    (Platform.OS !== "android" || Boolean(android)) &&
    (remote.status !== "ok" || remote.enabled !== false);

  return {
    signIn,
    signingIn,
    configured,
    redirectUri,
    hasNativeModule,
    isExpoGo: isExpoGo(),
  };
}
