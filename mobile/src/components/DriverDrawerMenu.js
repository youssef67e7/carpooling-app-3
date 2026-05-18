import { Modal, View, Text, Pressable, ScrollView, StyleSheet, I18nManager, Linking } from "react-native";
import { showAlert } from "../utils/showAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useTheme } from "../context/ThemeProvider";
import { weretPassenger as W } from "../theme/weretPassenger";
import { weretRadius, weretPalette } from "../theme/weretDesignSystem";

const SOCIAL = [
  { icon: "logo-instagram", url: "https://instagram.com" },
  { icon: "logo-facebook", url: "https://facebook.com" },
  { icon: "logo-whatsapp", url: "https://wa.me" },
  { icon: "logo-tiktok", url: "https://tiktok.com" },
];

export default function DriverDrawerMenu({ visible, onClose, navigation }) {
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const rtl = I18nManager.isRTL;

  function go(tab, stackScreen) {
    onClose();
    if (stackScreen) {
      navigation.navigate("More", { screen: stackScreen });
    } else if (tab) {
      navigation.navigate(tab);
    }
  }

  const items = [
    { key: "city", icon: "car-outline", label: t("driverMenuCity"), onPress: () => go("Home") },
    { key: "wallet", icon: "wallet-outline", label: t("driverMenuWallet"), onPress: () => go(null, "DriverWallet") },
    { key: "travel", icon: "earth", label: t("driverMenuTravel"), onPress: () => go(null, "DriverChooseVehicle") },
    { key: "shipping", icon: "truck-delivery-outline", label: t("driverMenuShipping"), onPress: () => go(null, "DriverChooseVehicle") },
    { key: "notif", icon: "bell-outline", label: t("driverMenuNotifications"), onPress: () => { onClose(); showAlert(t("driverMenuNotifications"), t("driverFeatureSoon")); } },
    { key: "safety", icon: "shield-check-outline", label: t("featureSafety"), onPress: () => go(null, "SafetyTips") },
    { key: "settings", icon: "cog-outline", label: t("settings"), onPress: () => go("Settings") },
    { key: "help", icon: "help-circle-outline", label: t("featureHelp"), onPress: () => go(null, "HelpCenter") },
    { key: "support", icon: "chat-processing-outline", label: t("driverMenuSupport"), onPress: () => { onClose(); showAlert(t("driverMenuSupport"), t("driverFeatureSoon")); } },
    { key: "reg", icon: "file-document-edit-outline", label: t("driverMenuOnlineReg"), onPress: () => go(null, "DriverOnboarding") },
    { key: "invite", icon: "gift-outline", label: t("driverMenuInvite"), onPress: () => { onClose(); showAlert(t("driverMenuInvite"), t("driverFeatureSoon")); } },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.overlay, { flexDirection: rtl ? "row-reverse" : "row", backgroundColor: weretPalette.scrim }]}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel={t("back")} />
        <View
          style={[
            styles.drawer,
            {
              paddingTop: insets.top + spacing.sm,
              paddingBottom: insets.bottom + spacing.md,
              backgroundColor: W.sheet,
              borderColor: W.border,
            },
          ]}
        >
          <View style={[styles.drawerHead, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={24} color={W.ink} />
            </Pressable>
            <View style={[styles.avatar, { backgroundColor: W.ink }]}>
              <Text style={{ color: W.onPrimary, fontWeight: "800", fontSize: 18 }}>
                {(user?.name || "?").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.name, { color: W.text, textAlign: rtl ? "right" : "left" }]}>{user?.name || "—"}</Text>
          <View style={[styles.starsRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <Text style={{ color: W.gold, letterSpacing: 2 }}>★★★★★</Text>
            <Text style={{ color: W.muted, marginStart: 8 }}>5.0</Text>
          </View>

          <ScrollView style={{ flex: 1, marginTop: spacing.md }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {items.map((row, i) => (
              <Pressable
                key={row.key}
                onPress={row.onPress}
                style={({ pressed }) => [
                  styles.menuRow,
                  {
                    flexDirection: rtl ? "row-reverse" : "row",
                    backgroundColor: i === 0 ? W.field : "transparent",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons name={row.icon} size={22} color={W.ink} />
                <Text style={[styles.menuLabel, { color: W.text, textAlign: rtl ? "right" : "left" }]}>{row.label}</Text>
                <MaterialCommunityIcons name={rtl ? "chevron-left" : "chevron-right"} size={20} color={W.muted} />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={() => {
              onClose();
              showAlert(t("driverPassengerMode"), t("driverPassengerModeBody"));
            }}
            style={[styles.passengerBtn, { backgroundColor: W.ink, borderRadius: weretRadius.pill }]}
          >
            <Text style={[styles.passengerBtnText, { color: W.onPrimary }]}>{t("driverPassengerMode")}</Text>
          </Pressable>

          <View style={[styles.social, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            {SOCIAL.map((s) => (
              <Pressable
                key={s.icon}
                onPress={() => Linking.openURL(s.url).catch(() => {})}
                style={styles.socialBtn}
              >
                <Ionicons name={s.icon} size={22} color={W.ink} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const DRAWER_WIDTH = 300;

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  dismiss: { flex: 1 },
  drawer: {
    width: DRAWER_WIDTH,
    maxWidth: "88%",
    borderStartWidth: 1,
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  drawerHead: { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 20, fontWeight: "800", marginTop: 12, paddingHorizontal: 16 },
  starsRow: { alignItems: "center", marginTop: 4, paddingHorizontal: 16 },
  menuRow: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  passengerBtn: {
    marginHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  passengerBtnText: { fontWeight: "800", fontSize: 15 },
  social: { justifyContent: "center", gap: 20, marginTop: 16 },
  socialBtn: { padding: 8 },
});
