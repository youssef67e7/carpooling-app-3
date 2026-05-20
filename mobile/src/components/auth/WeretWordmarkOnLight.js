import { View, Text, StyleSheet, Platform } from "react-native";

/**
 * Bold WERET wordmark for light backgrounds — single glyph layer (reliable on Android).
 */
export default function WeretWordmarkOnLight({
  label = "WERET",
  fontSize = 40,
  compact = false,
  disableUppercase = false,
}) {
  const letterSpacing = Platform.OS === "ios" ? (compact ? 6 : 10) : compact ? 5 : 8;
  const display = disableUppercase ? label : String(label || "WERET").toUpperCase();

  return (
    <View
      style={[styles.wrap, { minHeight: Math.ceil(fontSize * 1.2) }]}
      accessibilityRole="text"
      accessibilityLabel={display}
    >
      <Text
        style={[
          styles.mark,
          {
            fontSize,
            letterSpacing,
            lineHeight: Math.ceil(fontSize * 1.1),
          },
          Platform.OS === "android" ? styles.markAndroid : styles.markIos,
        ]}
      >
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 2,
  },
  mark: {
    fontWeight: "900",
    textAlign: "center",
    color: "#111111",
    includeFontPadding: false,
  },
  markIos: {
    textShadowColor: "rgba(0,0,0,0.12)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  markAndroid: {
    elevation: 0,
  },
});
