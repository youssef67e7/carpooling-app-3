import { View, Text, StyleSheet, I18nManager } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { weretType, weretRadius } from "../../../theme/weretDesignSystem";

export default function WeretStepHeader({ overline, title, subtitle, colors, spacing }) {
  const rtl = I18nManager.isRTL;
  const align = rtl ? "right" : "left";

  return (
    <Animated.View entering={FadeInUp.duration(320).springify().damping(18)} style={{ marginBottom: spacing.md }}>
      {overline ? (
        <Text style={[styles.overline, weretType.overline, { color: colors.textMuted, textAlign: align }]}>{overline}</Text>
      ) : null}
      <Text style={[styles.title, { color: colors.text, textAlign: align }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sub, { color: colors.textMuted, textAlign: align }]}>{subtitle}</Text>
      ) : null}
      <View style={[styles.rule, { backgroundColor: colors.border, alignSelf: rtl ? "flex-end" : "flex-start" }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overline: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.7, lineHeight: 34 },
  sub: { fontSize: 15, marginTop: 8, lineHeight: 22, fontWeight: "500" },
  rule: { width: 48, height: 4, borderRadius: weretRadius.pill, marginTop: 14 },
});
