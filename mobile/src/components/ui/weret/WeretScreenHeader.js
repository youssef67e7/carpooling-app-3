import { View, Text, StyleSheet, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "../PressableScale";
import { weretElevation, weretRadius } from "../../../theme/weretDesignSystem";

export default function WeretScreenHeader({ onBack, onClose, helpLabel, onHelp, colors, spacing, paddingHorizontal }) {
  const rtl = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.bar,
        {
          paddingHorizontal: paddingHorizontal ?? spacing.lg,
          flexDirection: rtl ? "row-reverse" : "row",
        },
      ]}
    >
      <PressableScale onPress={onBack} hitSlop={10} style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
        <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={22} color={colors.text} />
      </PressableScale>

      <View style={{ flex: 1, alignItems: "center" }}>
        {helpLabel && onHelp ? (
          <PressableScale
            onPress={onHelp}
            style={[
              styles.helpPill,
              {
                flexDirection: rtl ? "row-reverse" : "row",
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="help-circle-outline" size={16} color={colors.text} />
            <Text style={[styles.helpText, { color: colors.text }]}>{helpLabel}</Text>
          </PressableScale>
        ) : null}
      </View>

      <PressableScale onPress={onClose} hitSlop={10} style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
        <Ionicons name="close" size={22} color={colors.text} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: weretRadius.chip,
    alignItems: "center",
    justifyContent: "center",
    ...weretElevation.card,
  },
  helpPill: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: weretRadius.pill,
    borderWidth: 1,
  },
  helpText: { fontSize: 13, fontWeight: "800" },
});
