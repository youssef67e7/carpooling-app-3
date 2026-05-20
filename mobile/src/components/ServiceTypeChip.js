import { View, Text, Pressable, StyleSheet, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { weretPalette, weretPress, weretRadius } from "../theme/weretDesignSystem";
import { getServiceIconName } from "../utils/serviceTypeIcons";

export default function ServiceTypeChip({ typeKey, label, capacity, selected, onPress, weret = true }) {
  const rtl = I18nManager.isRTL;
  const iconName = getServiceIconName(typeKey);

  if (weret !== false) {
    const P = weretPalette;
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.wrapWeret,
          {
            borderRadius: weretRadius.card,
            borderColor: selected ? P.ink : P.border,
            backgroundColor: selected ? P.field : P.surface,
            borderWidth: selected ? 2 : 1,
            opacity: pressed ? weretPress.opacityStrong : 1,
          },
        ]}
      >
        <View style={[styles.iconCircleWeret, { backgroundColor: selected ? P.ink : P.field }]}>
          <MaterialCommunityIcons name={iconName} size={26} color={selected ? P.onPrimary : P.ink} />
        </View>
        <Text style={[styles.label, { color: P.ink, textAlign: "center" }]} numberOfLines={2}>
          {label}
        </Text>
        {capacity != null && capacity > 0 ? (
          <View style={[styles.capRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <MaterialCommunityIcons name="account" size={12} color={P.muted} />
            <Text style={[styles.capText, { color: P.muted }]}>{capacity}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        {
          borderColor: selected ? lime : colors.border,
          backgroundColor: selected ? colors.surfaceMuted : colors.surface,
          borderWidth: selected ? 2 : 1,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
        <MaterialCommunityIcons name={iconName} size={28} color={selected ? lime : colors.text} />
      </View>
      <Text style={[styles.label, { color: colors.text, textAlign: "center" }]} numberOfLines={2}>
        {label}
      </Text>
      {capacity != null && capacity > 0 ? (
        <View style={[styles.capRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <MaterialCommunityIcons name="account" size={12} color={colors.textMuted} />
          <Text style={[styles.capText, { color: colors.textMuted }]}>{capacity}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapWeret: {
    minWidth: 80,
    maxWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginEnd: 10,
    alignItems: "center",
  },
  iconCircleWeret: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  wrap: {
    minWidth: 76,
    maxWidth: 96,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    marginEnd: 10,
    alignItems: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    width: "100%",
  },
  capRow: {
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  capText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
