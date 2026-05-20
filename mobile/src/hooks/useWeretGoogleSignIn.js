import { useEffect, useCallback, useState, useMemo } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { googleSignInThunk, clearError } from "../store/slices/authSlice";
import { showAlert } from "../utils/showAlert";
import { formatGoogleOAuthError } from "../utils/googleOAuthErrors";

WebBrowser.maybeCompleteAuthSession();

function readGoogleIds(extra) {
  const web = String(
    extra.googleWebClientId ||
      (typeof process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID === "string" ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID : "") ||
      ""
  ).trim();
  const ios = String(
    extra.googleIosClientId ||
      (typeof process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID === "string" ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID : "") ||
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

export function useWeretGoogleSignIn() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
  const local = readGoogleIds(extra);
  const [remote, setRemote] = useState({ status: "idle" });

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
          expoClientId: String(data.expoClientId || "").trim(),
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
  const android = local.android || (remote.status === "ok" ? remote.androidClientId : "") || web;

  const scheme = Constants.expoConfig?.scheme || Constants.manifest?.scheme || "weret";
  const googleLang = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const appId = nativeApplicationId();

  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme,
        path: "oauthredirect",
        preferLocalhost: false,
        native: `${appId}:/oauthredirect`,
      }),
    [scheme, appId]
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: web,
      iosClientId: ios || undefined,
      androidClientId: android || undefined,
      redirectUri,
      language: googleLang,
      selectAccount: true,
    },
    { scheme, path: "oauthredirect", native: `${appId}:/oauthredirect` }
  );

  useEffect(() => {
    if (__DEV__ && web) {
      console.log("[Google OAuth] redirectUri:", redirectUri);
      console.log("[Google OAuth] web client:", web.slice(0, 12) + "…");
      if (Platform.OS === "android") console.log("[Google OAuth] android package:", appId);
    }
  }, [web, redirectUri, appId]);

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (!idToken) {
        showAlert(t("weretGoogleErrorTitle"), t("weretGoogleNoIdToken"), [{ text: "OK" }]);
        return;
      }
      dispatch(googleSignInThunk(idToken)).then((action) => {
        if (googleSignInThunk.rejected.match(action)) {
          showAlert(
            t("weretGoogleErrorTitle"),
            formatGoogleOAuthError(action.payload, t, redirectUri),
            [{ text: "OK" }]
          );
        }
      });
      return;
    }
    if (response.type === "error") {
      const raw =
        response.params?.error_description ||
        response.params?.error ||
        response.error?.message ||
        response.error?.code;
      showAlert(t("weretGoogleErrorTitle"), formatGoogleOAuthError(raw, t, redirectUri), [{ text: "OK" }]);
    }
  }, [response, dispatch, t, redirectUri]);

  const signIn = useCallback(async () => {
    if (remote.status === "ok" && remote.enabled === false) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleServerDisabled"), [{ text: "OK" }]);
      return;
    }
    if (!web) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleSetupSteps"), [{ text: "OK" }]);
      return;
    }
    if (!request) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleInitializing"), [{ text: "OK" }]);
      return;
    }
    dispatch(clearError());
    try {
      await WebBrowser.warmUpAsync();
    } catch {
      /* optional */
    }
    const result = await promptAsync({ showInRecents: true });
    if (result?.type === "dismiss" || result?.type === "cancel") return;
    if (result?.type === "error") {
      const raw = result.params?.error_description || result.params?.error || result.error?.message;
      showAlert(t("weretGoogleErrorTitle"), formatGoogleOAuthError(raw, t, redirectUri), [{ text: "OK" }]);
    }
  }, [web, request, remote, dispatch, promptAsync, t, redirectUri]);

  return {
    signIn,
    ready: Boolean(request),
    redirectUri,
    configured: Boolean(web) && (remote.status !== "ok" || remote.enabled !== false),
  };
}
