import { Pressable, Text, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { weretAuth as A } from "../../theme/weretAuth";
import { weretPress, weretRadius } from "../../theme/weretDesignSystem";

/** WERET secondary CTA — same field/border language as text inputs */
export default function WeretEmailContinueButton({ title, onPress, disabled, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        {
          opacity: pressed ? weretPress.opacityStrong : disabled ? weretPress.disabledOpacity : 1,
          borderRadius: weretRadius.field,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <MaterialCommunityIcons name="email-outline" size={22} color={A.ink} />
        <Text style={styles.label}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: A.field,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: A.border,
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: A.ink,
  },
});
