import { useMemo } from "react";
import { Platform, StyleSheet, I18nManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { weretPassenger as W } from "../theme/weretPassenger";
import { weretElevation, weretRadius } from "../theme/weretDesignSystem";

/** Bottom tab + header chrome — WERET (passenger + driver) */
export function useWeretTabScreenOptions() {
  const insets = useSafeAreaInsets();
  const rtl = I18nManager.isRTL;
  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 10 : 8);
  const headerEndPad = Math.max(insets.right, Platform.OS === "ios" ? 12 : 10);
  const headerStartPad = Math.max(insets.left, Platform.OS === "ios" ? 12 : 10);

  return useMemo(
    () => ({
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: W.sheet,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: W.border,
        elevation: 0,
      },
      headerTitleStyle: {
        color: W.text,
        fontWeight: "800",
        fontSize: 16,
        letterSpacing: Platform.OS === "ios" ? 0.5 : 0.3,
        textAlign: "center",
      },
      headerTitleAlign: "center",
      headerTitleContainerStyle: {
        maxWidth: "62%",
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
      },
      headerRightContainerStyle: {
        paddingEnd: headerEndPad,
        paddingStart: 18,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      },
      headerLeftContainerStyle: {
        paddingStart: headerStartPad,
        alignItems: "center",
      },
      headerTintColor: W.ink,
      tabBarActiveTintColor: W.accent,
      tabBarInactiveTintColor: W.muted,
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        direction: rtl ? "rtl" : "ltr",
        backgroundColor: W.sheet,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: W.border,
        height: (Platform.OS === "ios" ? 52 : 56) + bottomPad,
        paddingBottom: bottomPad,
        paddingTop: 6,
        ...weretElevation.tabBar,
      },
      tabBarItemStyle: {
        paddingTop: 4,
        borderRadius: weretRadius.chip,
        marginHorizontal: 4,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
    }),
    [rtl, bottomPad, headerEndPad, headerStartPad]
  );
}
