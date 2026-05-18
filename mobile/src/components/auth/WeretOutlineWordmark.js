import { View, Text, StyleSheet, Platform } from "react-native";

/** Chebyshev “shell” at distance r (square ring) — white stroke pixels. */
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
 * Centered “WERET” hollow wordmark: stacked white rings + black fill (black splash).
 */
export default function WeretOutlineWordmark({ label = "WERET", fontSize = 40 }) {
  const letterSpacing = Platform.OS === "ios" ? 10 : 8;
  const offsets = [...chebyshevRing(2), ...chebyshevRing(1)];
  const common = [styles.glyph, { fontSize, letterSpacing }];

  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={label}>
      {offsets.map(([dx, dy], i) => (
        <Text
          key={`s${i}-${dx}-${dy}`}
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
    textTransform: "uppercase",
    textAlign: "center",
    position: "absolute",
  },
  stroke: {
    color: "#ffffff",
  },
  fill: {
    color: "#000000",
    position: "relative",
  },
});
