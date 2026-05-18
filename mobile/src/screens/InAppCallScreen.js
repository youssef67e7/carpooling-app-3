import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, I18nManager } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { onWebrtcSignal, sendWebrtcSignal, joinWebrtcRoom, leaveWebrtcRoom } from "../realtime/socket";
import { showAlert } from "../utils/showAlert";

/**
 * Signaling-only call UI.
 * Actual WebRTC media requires a Dev Build (Expo Go doesn't support WebRTC).
 */
export default function InAppCallScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;

  const rideId = route.params?.rideId;
  const otherName = route.params?.otherName || t("voiceCall");
  const mode = route.params?.mode || "outgoing"; // outgoing | incoming

  const [state, setState] = useState(mode === "incoming" ? "ringing" : "calling"); // calling | ringing | connected | ended
  const sentEndRef = useRef(false);

  const title = useMemo(() => {
    if (state === "connected") return t("callConnected");
    if (state === "ringing") return t("callRinging");
    if (state === "ended") return t("callEnded");
    return t("callCalling");
  }, [state, t]);

  useEffect(() => {
    if (!rideId) return;
    joinWebrtcRoom(rideId);
    const off = onWebrtcSignal((p) => {
      if (!p?.rideId || String(p.rideId) !== String(rideId)) return;
      const type = p?.data?.type;
      if (type === "call:offer") {
        setState((s) => (s === "ended" ? s : "ringing"));
      }
      if (type === "call:answer") {
        setState((s) => (s === "ended" ? s : "connected"));
      }
      if (type === "call:end") {
        setState("ended");
        navigation.goBack();
      }
    });
    return () => {
      off?.();
      leaveWebrtcRoom(rideId);
    };
  }, [rideId, navigation]);

  useEffect(() => {
    // Fire outgoing "offer" once.
    if (!rideId) return;
    if (mode !== "outgoing") return;
    if (sentEndRef.current) return;
    sendWebrtcSignal(rideId, { type: "call:offer", ts: Date.now() });
  }, [rideId, mode]);

  function accept() {
    if (!rideId) return;
    setState("connected");
    sendWebrtcSignal(rideId, { type: "call:answer", ts: Date.now() });
    showAlert(t("voiceCall"), t("inAppCallNeedsDevBuild"));
  }

  function end() {
    if (!rideId) {
      navigation.goBack();
      return;
    }
    if (!sentEndRef.current) {
      sentEndRef.current = true;
      sendWebrtcSignal(rideId, { type: "call:end", ts: Date.now() });
    }
    setState("ended");
    navigation.goBack();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, padding: spacing.lg }]}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted, textAlign: rtl ? "right" : "left" }}>{title}</Text>
        <Text style={{ marginTop: 8, color: colors.text, fontSize: 26, fontWeight: "900", textAlign: rtl ? "right" : "left" }}>
          {otherName}
        </Text>
        <Text style={{ marginTop: 10, color: colors.textMuted, lineHeight: 18, textAlign: rtl ? "right" : "left" }}>
          {t("inAppCallNeedsDevBuild")}
        </Text>
      </View>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.md }}>
        {state === "ringing" ? (
          <Pressable
            onPress={accept}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: colors.success, borderRadius: radius.lg, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.btnText}>{t("accept")}</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={end}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.danger, borderRadius: radius.lg, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="close" size={20} color="#fff" />
          <Text style={styles.btnText}>{t("endCall")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  btn: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
});

