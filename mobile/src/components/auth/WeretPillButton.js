import { Pressable, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { weretAuth as A } from "../../theme/weretAuth";
import { weretPress, weretRadius, weretElevation } from "../../theme/weretDesignSystem";

export default function WeretPillButton({
  title,
  onPress,
  variant = "fill",
  icon,
  disabled,
  loading,
  style,
}) {
  const outline = variant === "outline";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.fill,
        {
          opacity: pressed ? weretPress.opacity : disabled ? weretPress.disabledOpacity : 1,
          borderRadius: weretRadius.pill,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? A.ink : A.onPrimary} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, outline ? styles.labelOutline : styles.labelFill]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  fill: {
    backgroundColor: A.ink,
    ...weretElevation.fab,
  },
  outline: {
    backgroundColor: A.bg,
    borderWidth: 2,
    borderColor: A.ink,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  icon: { marginRight: 2 },
  label: { fontSize: 16, fontWeight: "800" },
  labelFill: { color: A.onPrimary },
  labelOutline: { color: A.ink },
});
