import { View, StyleSheet } from "react-native";
import { weretPalette } from "../../../theme/weretDesignSystem";

/** Premium bottom-sheet grab handle */
export default function WeretSheetHandle() {
  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  bar: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: weretPalette.track,
  },
});
