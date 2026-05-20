import { View, StyleSheet, Platform } from "react-native";
import { weretElevation } from "../../../theme/weretDesignSystem";

export default function WeretStickyFooter({ children, colors, spacing, bottomInset }) {
  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: spacing.lg,
          paddingBottom: bottomInset + spacing.md,
          paddingTop: spacing.sm,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        weretElevation.tabBar,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: Platform.OS === "ios" ? StyleSheet.hairlineWidth : 1,
  },
});
