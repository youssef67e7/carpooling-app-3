import { Modal, View, Text, Pressable, StyleSheet, I18nManager } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useTheme } from "../../context/ThemeProvider";
import { D } from "../../animation/presets";

/**
 * Bottom sheet style action list (admin moderation).
 * @param {Array<{ key: string, label: string, onPress: () => void, destructive?: boolean, approve?: boolean }>} items
 */
export default function AdminBottomSheet({ visible, onClose, title, subtitle, items = [], cancelLabel = "Cancel" }) {
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View entering={FadeIn.duration(D.fast)} style={[StyleSheet.absoluteFill, styles.dim]} />
        </Pressable>
        <Animated.View
          entering={SlideInDown.duration(D.normal)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderColor: colors.border,
              paddingBottom: spacing.lg,
            },
          ]}
        >
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          {title ? (
            <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{title}</Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{subtitle}</Text>
          ) : null}
          <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
            {items.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => {
                  onClose?.();
                  requestAnimationFrame(() => a.onPress?.());
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceMuted : colors.bg,
                    borderRadius: radius.md,
                  },
                  a.destructive ? { borderColor: colors.danger } : null,
                  a.approve ? { borderColor: colors.success } : null,
                ]}
              >
                <Text
                  style={{
                    color: a.destructive ? colors.danger : a.approve ? colors.success : colors.text,
                    fontWeight: "700",
                    textAlign: rtl ? "right" : "left",
                    flex: 1,
                  }}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={[styles.row, { marginTop: spacing.md, borderColor: colors.border, borderRadius: radius.md }]}
          >
            <Text style={{ color: colors.textMuted, fontWeight: "700", textAlign: "center", width: "100%" }}>{cancelLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    backgroundColor: "rgba(10,14,23,0.55)",
  },
  sheet: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    maxHeight: "72%",
  },
  handle: { width: 40, height: 4, borderRadius: 2 },
  title: { fontSize: 18, fontWeight: "800" },
  sub: { fontSize: 13, marginTop: 4 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
});
