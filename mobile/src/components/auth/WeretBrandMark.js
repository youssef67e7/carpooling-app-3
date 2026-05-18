import { View, Text, StyleSheet, Platform, I18nManager } from "react-native";
import { weretAuth as A } from "../../theme/weretAuth";
import { weretPalette } from "../../theme/weretDesignSystem";

/**
 * Bold stacked logo: shadow layer + main text (3D-ish on white),
 * or bright text on dark splash.
 */
export default function WeretBrandMark({ title, subtitle, tone = "onLight", size = 38 }) {
  const rtl = I18nManager.isRTL;

  if (tone === "onDark") {
    return (
      <View style={styles.center}>
        <Text
          style={[
            styles.word,
            {
              fontSize: size,
              color: weretPalette.onPrimary,
              letterSpacing: Platform.OS === "ios" ? 8 : 6,
              textShadowColor: "rgba(255,255,255,0.45)",
              textShadowOffset: { width: -1, height: -1 },
              textShadowRadius: 0,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subDark, { textAlign: rtl ? "right" : "center" }]}>{subtitle}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <View style={styles.layered}>
        <Text
          style={[
            styles.word,
            styles.shadowLayer,
            {
              fontSize: size,
              letterSpacing: Platform.OS === "ios" ? 5 : 4,
            },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.word,
            styles.mainLayer,
            {
              fontSize: size,
              letterSpacing: Platform.OS === "ios" ? 5 : 4,
            },
          ]}
        >
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subLight, { color: A.muted, textAlign: rtl ? "right" : "center" }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  layered: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  word: {
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
  },
  shadowLayer: {
    position: "absolute",
    color: weretPalette.logoShadow,
    top: Platform.OS === "ios" ? 4 : 3,
    left: Platform.OS === "ios" ? 4 : 3,
  },
  mainLayer: {
    color: A.ink,
  },
  subLight: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    maxWidth: 280,
    lineHeight: 18,
  },
  subDark: {
    marginTop: 12,
    fontSize: 14,
    color: weretPalette.subtitleOnDark,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
