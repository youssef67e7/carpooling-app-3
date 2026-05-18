import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { I18nManager } from "react-native";

import en from "../locales/en.json";
import ar from "../locales/ar.json";

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

function applyRtl(isRtl) {
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.allowRTL(isRtl);
    I18nManager.forceRTL(isRtl);
  }
}

const device = Localization.getLocales?.()[0]?.languageCode || "en";
const initialLng = device === "ar" ? "ar" : "en";
applyRtl(initialLng === "ar");

/** Load once at startup so the app does not wait on an async gate in App.js. */
i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

/** Kept for callers that await it; i18n is already initialized. */
export async function initI18n() {
  return Promise.resolve();
}

export function setAppLanguage(lng) {
  const isRtl = lng === "ar";
  applyRtl(isRtl);
  return i18n.changeLanguage(lng);
}

export default i18n;
