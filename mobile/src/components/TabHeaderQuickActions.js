import { View, Pressable, I18nManager, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { logoutThunk } from "../store/slices/authSlice";
import { useTheme } from "../context/ThemeProvider";

const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

export default function TabHeaderQuickActions({ routeName, navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const rtl = I18nManager.isRTL;

  return (
    <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      {routeName !== "History" ? (
        <Pressable
          onPress={() => navigation.navigate("History")}
          hitSlop={HIT}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={t("history")}
        >
          <Ionicons name="time-outline" size={24} color={colors.primary} />
        </Pressable>
      ) : null}
      {routeName !== "Settings" ? (
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={HIT}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={t("settings")}
        >
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </Pressable>
      ) : null}
        <Pressable
          onPress={() => dispatch(logoutThunk())}
          hitSlop={HIT}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={t("logout")}
        >
        <Ionicons name="exit-outline" size={24} color={colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexShrink: 0,
  },
  btn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
