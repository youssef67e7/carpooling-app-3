import { View, StyleSheet } from "react-native";
import { weretPalette } from "../../../theme/weretDesignSystem";

/**
 * Soft decorative blobs — adds depth without gradients dependency.
 */
export default function WeretAmbientBackground({ variant = "light", children, style }) {
  const dark = variant === "dark";
  const blobA = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)";
  const blobB = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const base = dark ? "#121212" : weretPalette.surfaceMuted;

  return (
    <View style={[styles.root, { backgroundColor: base }, style]}>
      <View pointerEvents="none" style={[styles.blob, styles.blobTop, { backgroundColor: blobA }]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobMid, { backgroundColor: blobB }]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBottom, { backgroundColor: blobA }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  blob: { position: "absolute", borderRadius: 999 },
  blobTop: { width: 280, height: 280, top: -90, right: -70 },
  blobMid: { width: 200, height: 200, top: "38%", left: -60 },
  blobBottom: { width: 320, height: 320, bottom: -120, left: -40 },
});
