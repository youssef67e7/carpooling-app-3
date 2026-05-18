import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, I18nManager } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../i18n";
import { useTheme } from "../context/ThemeProvider";
import { weretPalette } from "../theme/weretDesignSystem";
import { D } from "../animation/presets";

const TRACK_PAD = 4;

/** Segmented language control with sliding highlight (Reanimated). */
export default function LanguageBar({ variant }) {
  const { t, i18n } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const [innerW, setInnerW] = useState(0);
  const pillX = useSharedValue(0);

  const en = i18n.language === "en";
  const ar = i18n.language === "ar";

  async function switchLang(lng) {
    await setAppLanguage(lng);
    await i18n.changeLanguage(lng);
  }

  const segmentW = innerW > 0 ? innerW / 2 : 0;

  useEffect(() => {
    if (variant === "weret") return;
    if (segmentW <= 0) return;
    const targetX = rtl ? (en ? segmentW : 0) : en ? 0 : segmentW;
    pillX.value = withSpring(targetX, D.spring);
  }, [variant, en, rtl, segmentW, pillX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  if (variant === "weret") {
    return (
      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 18,
          marginBottom: 6,
        }}
      >
        <Pressable accessibilityRole="button" onPress={() => switchLang("en")}>
          <Text style={{ fontSize: 15, fontWeight: en ? "900" : "500", color: weretPalette.ink }}>{t("english")}</Text>
        </Pressable>
        <Text style={{ color: weretPalette.mutedLight, fontWeight: "300" }}>|</Text>
        <Pressable accessibilityRole="button" onPress={() => switchLang("ar")}>
          <Text style={{ fontSize: 15, fontWeight: ar ? "900" : "500", color: weretPalette.ink }}>{t("arabic")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginVertical: spacing.sm }}>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
        {t("language")}
      </Text>
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.full,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            padding: TRACK_PAD,
          },
        ]}
      >
        <View
          style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}
          onLayout={(e) => setInnerW(e.nativeEvent.layout.width)}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                width: segmentW,
                opacity: segmentW > 0 ? 1 : 0,
                backgroundColor: colors.primarySoft || colors.surface,
                borderRadius: radius.lg,
              },
              thumbStyle,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: en }}
            onPress={() => switchLang("en")}
            style={({ pressed }) => [styles.segment, { zIndex: 1, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: en ? "800" : "500", textAlign: "center" }}>
              {t("english")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: ar }}
            onPress={() => switchLang("ar")}
            style={({ pressed }) => [styles.segment, { zIndex: 1, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: ar ? "800" : "500", textAlign: "center" }}>
              {t("arabic")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { alignSelf: "stretch" },
  row: {
    position: "relative",
    minHeight: 44,
    alignItems: "stretch",
  },
  thumb: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
