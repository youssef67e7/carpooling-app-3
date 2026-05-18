import { useEffect, useCallback, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { googleSignInThunk, clearError } from "../store/slices/authSlice";
import { showAlert } from "../utils/showAlert";

WebBrowser.maybeCompleteAuthSession();

/** Placeholder so `useIdTokenAuthRequest` always receives a syntactically valid client id when env is empty. */
const DUMMY_GOOGLE_CLIENT_ID = "000000000000-placeholder.apps.googleusercontent.com";

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

export function useWeretGoogleSignIn() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
  const local = readGoogleIds(extra);
  /** `idle` = not loaded; `ok` = got JSON; `error` = request failed (still allow local .env). */
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
        });
      })
      .catch(() => {
        if (alive) setRemote({ status: "error" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const web =
    local.web || (remote.status === "ok" ? remote.webClientId : "") || "";
  const ios =
    local.ios || (remote.status === "ok" ? remote.iosClientId : "") || "";
  const android =
    local.android || (remote.status === "ok" ? remote.androidClientId : "") || "";

  const scheme = Constants.expoConfig?.scheme || Constants.manifest?.scheme || "weret";
  const googleLang = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";

  const clientId = web || DUMMY_GOOGLE_CLIENT_ID;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId,
      iosClientId: ios || undefined,
      androidClientId: android || undefined,
      language: googleLang,
      selectAccount: true,
    },
    { scheme, path: "oauthredirect" }
  );

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (idToken) dispatch(googleSignInThunk(idToken));
      else showAlert(t("weretGoogleErrorTitle"), t("weretGoogleNoIdToken"), [{ text: "OK" }]);
      return;
    }
    if (response.type === "error") {
      const msg =
        response.params?.error_description ||
        response.error?.message ||
        response.error?.code ||
        t("weretGoogleErrorBody");
      showAlert(t("weretGoogleErrorTitle"), String(msg), [{ text: "OK" }]);
    }
  }, [response, dispatch, t]);

  const signIn = useCallback(async () => {
    if (remote.status === "ok" && remote.enabled === false) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleServerDisabled"), [{ text: "OK" }]);
      return;
    }
    if (!web) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleNotConfigured"), [{ text: "OK" }]);
      return;
    }
    if (!request) {
      showAlert(t("weretGoogleErrorTitle"), t("weretGoogleInitializing"), [{ text: "OK" }]);
      return;
    }
    dispatch(clearError());
    const result = await promptAsync({ showInRecents: false });
    if (result?.type === "dismiss" || result?.type === "cancel") return;
  }, [web, request, remote, dispatch, promptAsync, t]);

  return {
    signIn,
    /** Loaded auth request (may be null for a short time after mount). */
    ready: Boolean(request),
    /** True when we have a web client id and the API reports Google is enabled (or still loading). */
    configured:
      Boolean(web) &&
      (remote.status !== "ok" || remote.enabled !== false),
  };
}
