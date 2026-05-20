/** Map Google OAuth / GSI errors to user-facing i18n-friendly hints. */
export function formatGoogleOAuthError(raw, t, redirectUri = "") {
  const s = String(raw || "").toLowerCase();

  if (
    s.includes("access_not_configured") ||
    s.includes("api console") ||
    s.includes("apis") ||
    s.includes("has not been used") ||
    s.includes("is disabled") ||
    s.includes("enable it by visiting")
  ) {
    return t("weretGoogleApisConsole");
  }
  if (s.includes("redirect_uri_mismatch") || s.includes("redirect_uri")) {
    return t("weretGoogleRedirectMismatch", { uri: redirectUri || "weret:/oauthredirect" });
  }
  if (s.includes("invalid_client")) {
    return t("weretGoogleInvalidClient");
  }
  if (s.includes("access_denied") || s.includes("cancelled") || s.includes("canceled")) {
    return t("weretGoogleCancelled");
  }
  if (s.includes("not enabled on this server") || s.includes("not configured")) {
    return t("weretGoogleServerDisabled");
  }

  return String(raw || "").trim() || t("weretGoogleErrorBody");
}
