import { View, Text, Image, ActivityIndicator, StyleSheet, I18nManager } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "../PressableScale";
import { weretElevation, weretRadius } from "../../../theme/weretDesignSystem";

export default function WeretUploadCard({
  title,
  subtitle,
  uri,
  imageSource,
  onPress,
  busy,
  colors,
  spacing,
  compact,
}) {
  const rtl = I18nManager.isRTL;
  const thumb = compact ? 64 : 76;

  return (
    <PressableScale onPress={onPress} disabled={busy} accessibilityRole="button" style={{ flex: compact ? 1 : undefined }}>
      <View
        style={[
          styles.card,
          {
            borderColor: uri ? colors.text : colors.border,
            backgroundColor: colors.surface,
            padding: spacing.md,
            ...weretElevation.card,
          },
        ]}
      >
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={[
              styles.thumb,
              {
                width: thumb,
                height: thumb,
                borderRadius: weretRadius.chip,
                borderColor: uri ? colors.text : colors.border,
                backgroundColor: colors.surfaceMuted,
              },
            ]}
          >
            {imageSource ? (
              <Animated.View entering={FadeIn.duration(240)} style={styles.thumbInner}>
                <Image source={imageSource} style={styles.img} resizeMode="cover" />
                <View style={styles.badge}>
                  <Ionicons name="checkmark" size={14} color={colors.primaryText} />
                </View>
              </Animated.View>
            ) : busy ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <View style={[styles.addCircle, { backgroundColor: colors.text }]}>
                <Ionicons name="camera-outline" size={22} color={colors.primaryText} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{subtitle}</Text>
            ) : null}
          </View>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={18} color={colors.textMuted} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: weretRadius.card, borderWidth: 1.5, borderStyle: "dashed" },
  thumb: { borderWidth: 1.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  thumbInner: { width: "100%", height: "100%" },
  img: { width: "100%", height: "100%" },
  addCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "800" },
  sub: { marginTop: 4, fontSize: 12, fontWeight: "600", lineHeight: 16 },
});
