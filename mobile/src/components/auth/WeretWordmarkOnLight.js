import { View, Text, StyleSheet, Platform } from "react-native";

function chebyshevRing(r) {
  const o = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r) o.push([dx, dy]);
    }
  }
  return o;
}

/**
 * Bold wordmark for white backgrounds: white fill, black outline, soft offset “shadow”.
 */
export default function WeretWordmarkOnLight({ label = "WERET", fontSize = 40, compact = false, disableUppercase = false }) {
  const letterSpacing = Platform.OS === "ios" ? (compact ? 6 : 10) : compact ? 5 : 8;
  const rings = compact ? chebyshevRing(1) : [...chebyshevRing(3), ...chebyshevRing(2), ...chebyshevRing(1)];
  const common = [
    styles.glyph,
    { fontSize, letterSpacing },
    disableUppercase ? styles.noUpper : styles.upper,
  ];

  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={label}>
      {!compact ? (
        <Text
          pointerEvents="none"
          style={[
            ...common,
            styles.shadow,
            { transform: [{ translateX: 5 }, { translateY: 5 }] },
          ]}
        >
          {label}
        </Text>
      ) : null}
      {rings.map(([dx, dy], i) => (
        <Text
          key={`k${i}-${dx}-${dy}`}
          pointerEvents="none"
          style={[...common, styles.stroke, { transform: [{ translateX: dx }, { translateY: dy }] }]}
        >
          {label}
        </Text>
      ))}
      <Text style={[...common, styles.fill]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glyph: {
    fontWeight: "900",
    textAlign: "center",
    position: "absolute",
  },
  upper: { textTransform: "uppercase" },
  noUpper: { textTransform: "none" },
  stroke: {
    color: "#000000",
  },
  fill: {
    color: "#ffffff",
    position: "relative",
  },
  shadow: {
    color: "rgba(0,0,0,0.22)",
  },
});
