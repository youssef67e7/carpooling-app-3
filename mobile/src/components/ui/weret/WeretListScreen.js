import { ScrollView, View, StyleSheet } from "react-native";
import WeretAmbientBackground from "./WeretAmbientBackground";

/** Standard list screen: ambient bg + padded scroll content. */
export default function WeretListScreen({ children, contentContainerStyle, scroll = true, variant }) {
  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentContainerStyle]}>{children}</View>
  );

  return <WeretAmbientBackground variant={variant}>{body}</WeretAmbientBackground>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
});
