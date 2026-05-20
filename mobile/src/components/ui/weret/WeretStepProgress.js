import { View, Text, StyleSheet, I18nManager } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { weretRadius } from "../../../theme/weretDesignSystem";

export default function WeretStepProgress({ step, total, label, colors, spacing }) {
  const rtl = I18nManager.isRTL;
  const pct = Math.min(1, Math.max(0, step / total));

  return (
    <Animated.View entering={FadeIn.duration(280)} style={{ marginTop: spacing.sm }}>
      {label ? (
        <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <Text style={[styles.label, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{label}</Text>
          <Text style={[styles.stepNum, { color: colors.text }]}>
            {step}/{total}
          </Text>
        </View>
      ) : (
        <Text style={[styles.stepNum, { color: colors.text, textAlign: rtl ? "left" : "right", marginBottom: 4 }]}>
          {step}/{total}
        </Text>
      )}
      <View style={[styles.dots, { flexDirection: rtl ? "row-reverse" : "row", marginTop: spacing.sm }]}>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <View
              key={n}
              style={[
                styles.dot,
                {
                  backgroundColor: done || active ? colors.text : colors.border,
                  opacity: active ? 1 : done ? 0.85 : 0.35,
                  transform: [{ scale: active ? 1.15 : 1 }],
                },
              ]}
            />
          );
        })}
      </View>
      <View style={[styles.track, { backgroundColor: colors.border, marginTop: spacing.sm }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: colors.text }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3, flex: 1 },
  stepNum: { fontSize: 13, fontWeight: "900", letterSpacing: -0.2 },
  dots: { gap: 8, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: weretRadius.pill },
  track: { height: 5, borderRadius: weretRadius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: weretRadius.pill },
});
