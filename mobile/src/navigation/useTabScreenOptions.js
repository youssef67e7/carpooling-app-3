import { useMemo } from "react";
import { Platform, StyleSheet, I18nManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeProvider";

export function useTabScreenOptions() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rtl = I18nManager.isRTL;
  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 10 : 8);
  const headerEndPad = Math.max(insets.right, Platform.OS === "ios" ? 12 : 10);
  const headerStartPad = Math.max(insets.left, Platform.OS === "ios" ? 12 : 10);

  return useMemo(
    () => ({
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        elevation: 0,
      },
      headerTitleStyle: {
        color: colors.text,
        fontWeight: "700",
        fontSize: 17,
        letterSpacing: Platform.OS === "ios" ? -0.3 : 0,
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
      headerTintColor: colors.primary,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        direction: rtl ? "rtl" : "ltr",
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        height: (Platform.OS === "ios" ? 52 : 56) + bottomPad,
        paddingBottom: bottomPad,
        paddingTop: 6,
        elevation: 12,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
      },
      tabBarItemStyle: { paddingTop: 4 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
    }),
    [colors, rtl, bottomPad, headerEndPad, headerStartPad]
  );
}
