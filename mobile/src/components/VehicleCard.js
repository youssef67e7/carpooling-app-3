import { View, Text, Pressable, Image, StyleSheet, I18nManager } from "react-native";
import { useTheme } from "../context/ThemeProvider";

export default function VehicleCard({ name, image, capacity, priceLabel, selected, onPress }) {
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          opacity: pressed ? 0.92 : 1,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.surfaceMuted }]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, { alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>—</Text>
          </View>
        )}
      </View>
      <Text style={[styles.name, { color: colors.text, textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.cap, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>
        {capacity}
      </Text>
      <Text style={[styles.price, { color: colors.primary, textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>
        {priceLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 132,
    padding: 10,
    marginEnd: 10,
  },
  imageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  image: { width: "100%", height: 72, borderRadius: 12 },
  name: { fontWeight: "800", fontSize: 15, marginBottom: 2 },
  cap: { fontSize: 12, marginBottom: 4 },
  price: { fontWeight: "700", fontSize: 14 },
});
