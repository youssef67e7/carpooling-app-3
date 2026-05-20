import { View, Text, StyleSheet, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PressableScale from "../PressableScale";
import { weretElevation, weretRadius } from "../../../theme/weretDesignSystem";

/** Large tappable row — vehicle type, settings option, etc. */
export default function WeretOptionCard({
  title,
  subtitle,
  iconName,
  iconFamily = "material",
  onPress,
  colors,
  selected,
  meta,
}) {
  const rtl = I18nManager.isRTL;
  const Icon = iconFamily === "ionicons" ? Ionicons : MaterialCommunityIcons;

  return (
    <PressableScale onPress={onPress} accessibilityRole="button">
      <View
        style={[
          styles.card,
          {
            flexDirection: rtl ? "row-reverse" : "row",
            borderColor: selected ? colors.text : colors.border,
            backgroundColor: colors.surface,
            borderWidth: selected ? 2 : 1,
            ...(selected ? weretElevation.heroFloat : weretElevation.card),
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.text }]}>
          <Icon name={iconName} size={28} color={colors.primaryText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? <View style={{ marginTop: 6 }}>{meta}</View> : null}
        </View>
        <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={20} color={colors.textMuted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: weretRadius.card,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  sub: { fontSize: 13, marginTop: 4, fontWeight: "600", lineHeight: 18 },
});
