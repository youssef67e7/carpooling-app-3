import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  I18nManager,
  ActivityIndicator,
} from "react-native";
import { showAlert } from "../utils/showAlert";
import { useRoute, useNavigation, useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { fetchRideMessagesThunk, sendRideMessageThunk, fetchRideById } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import ReportUserModal from "../components/ReportUserModal";
import {
  joinWebrtcRoom,
  leaveWebrtcRoom,
  onRideMessage,
  emitRideTyping,
  onRideTyping,
} from "../realtime/socket";
import { onWebrtcSignal } from "../realtime/socket";

function sanitizeTel(s) {
  if (!s || typeof s !== "string") return "";
  const t = s.trim().replace(/[^\d+]/g, "");
  return t.length >= 6 ? t : "";
}

export default function RideChatScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const { user } = useSelector((s) => s.auth);
  const rideId = route.params?.rideId;
  const listRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [ride, setRide] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimerRef = useRef(null);

  const myId = user?._id;
  const canSend =
    ride &&
    ride.status !== "completed" &&
    (ride.status === "pending" ||
      ride.status === "accepted" ||
      ride.status === "ongoing");

  const myMode = (user?.active_role || user?.role) === "driver" ? "driver" : "passenger";
  const otherParty =
    myMode === "passenger"
      ? ride?.driverId
      : ride?.passengerId;

  const otherPhone = sanitizeTel(otherParty?.phone);
  const otherName = otherParty?.name || (myMode === "passenger" ? t("driver") : t("passenger"));

  const loadMessages = useCallback(async () => {
    if (!rideId) return;
    try {
      const { messages: list } = await dispatch(fetchRideMessagesThunk(rideId)).unwrap();
      setMessages(Array.isArray(list) ? list : []);
    } catch {
      /* keep list */
    }
  }, [dispatch, rideId]);

  const loadRide = useCallback(async () => {
    if (!rideId) return;
    try {
      const r = await dispatch(fetchRideById(rideId)).unwrap();
      setRide(r);
    } catch {
      setRide(null);
    }
  }, [dispatch, rideId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadRide();
      await loadMessages();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRide, loadMessages]);

  useEffect(() => {
    if (!isFocused || !rideId) return undefined;
    const id = setInterval(() => {
      loadMessages();
    }, 2500);
    return () => clearInterval(id);
  }, [isFocused, rideId, loadMessages]);

  // Realtime messages (instant delivery without waiting for polling).
  useEffect(() => {
    if (!isFocused || !rideId) return undefined;
    const off = onRideMessage((payload) => {
      if (!payload?.rideId || String(payload.rideId) !== String(rideId)) return;
      const msg = payload?.message;
      if (!msg?._id) return;
      setMessages((prev) => {
        if (prev.some((m) => m?._id === msg._id)) return prev;
        return [...prev, msg];
      });
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    return () => off?.();
  }, [isFocused, rideId]);

  // Typing indicator (realtime).
  useEffect(() => {
    if (!isFocused || !rideId) return undefined;
    const off = onRideTyping((payload) => {
      if (!payload?.rideId || String(payload.rideId) !== String(rideId)) return;
      const from = payload?.fromUserId;
      if (from && String(from) === String(myId)) return;
      const isTyping = Boolean(payload?.isTyping);
      setOtherTyping(isTyping);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (isTyping) typingTimerRef.current = setTimeout(() => setOtherTyping(false), 2500);
    });
    return () => {
      off?.();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [isFocused, rideId, myId]);

  useEffect(() => {
    if (!isFocused || !rideId) return undefined;
    joinWebrtcRoom(rideId);
    return () => leaveWebrtcRoom(rideId);
  }, [isFocused, rideId]);

  // Incoming in-app call: when other side sends offer, open call screen.
  useEffect(() => {
    if (!isFocused || !rideId) return undefined;
    const off = onWebrtcSignal((payload) => {
      if (!payload?.rideId || String(payload.rideId) !== String(rideId)) return;
      const type = payload?.data?.type;
      if (type === "call:offer") {
        navigation.navigate("InAppCall", { rideId, otherName, mode: "incoming" });
      }
    });
    return () => off?.();
  }, [isFocused, rideId, navigation, otherName]);

  useLayoutEffect(() => {
    const canReport = !!otherParty?._id && String(otherParty._id) !== String(myId);
    navigation.setOptions({
      title: t("rideChatTitle"),
      headerRight: () => (
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center" }}>
          {canReport ? (
            <Pressable
              onPress={() => setReportOpen(true)}
              hitSlop={12}
              style={{ paddingHorizontal: 8, paddingVertical: 8 }}
              accessibilityLabel={t("reportUserTitle")}
            >
              <Ionicons name="flag-outline" size={24} color={colors.primary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              if (!rideId) return;
              navigation.navigate("InAppCall", { rideId, otherName, mode: "outgoing" });
            }}
            hitSlop={12}
            style={{ paddingHorizontal: 8, paddingVertical: 8 }}
            accessibilityLabel={t("inAppVoiceCall")}
          >
            <Ionicons name="wifi-outline" size={24} color={colors.primary} />
          </Pressable>
          {otherPhone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${otherPhone}`)}
              hitSlop={12}
              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
              accessibilityLabel={t("callOtherParty")}
            >
              <Ionicons name="call-outline" size={24} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ),
    });
  }, [navigation, t, otherPhone, colors.primary, ride, otherParty, myId, rtl]);

  async function onSend() {
    const text = input.trim();
    if (!text || !rideId || !canSend) return;
    setSending(true);
    setInput("");
    try {
      const msg = await dispatch(sendRideMessageThunk({ rideId, text })).unwrap();
      setMessages((prev) => [...prev, msg]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      showAlert(t("error"), String(e));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function onCallPress() {
    if (otherPhone) {
      Linking.openURL(`tel:${otherPhone}`).catch(() => {});
      return;
    }
    showAlert(t("callOtherParty"), t("phoneMissingHint"));
  }

  const renderItem = ({ item }) => {
    const sid = item.senderId?._id ?? item.senderId;
    const mine = String(sid) === String(myId);
    return (
      <View
        style={[
          styles.bubbleRow,
          { flexDirection: rtl ? "row-reverse" : "row", justifyContent: mine ? "flex-end" : "flex-start" },
        ]}
      >
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: mine ? colors.primary : colors.surfaceMuted,
              borderColor: mine ? colors.primary : colors.border,
              maxWidth: "82%",
            },
          ]}
        >
          {!mine ? (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{item.senderId?.name || ""}</Text>
          ) : null}
          <Text style={{ color: mine ? colors.primaryText : colors.text, fontSize: 15, lineHeight: 20 }}>{item.text}</Text>
        </View>
      </View>
    );
  };

  if (!rideId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textMuted }}>{t("error")}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: rtl ? "right" : "left" }}>
          {t("rideChatWith", { name: otherName })}
        </Text>
        {otherTyping ? (
          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
            {t("typingNow")}
          </Text>
        ) : null}
        {!otherPhone ? (
          <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
            {t("phoneMissingShort")}
          </Text>
        ) : null}
        <Pressable
          onPress={onCallPress}
          style={[
            styles.callBar,
            {
              marginTop: spacing.sm,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              flexDirection: rtl ? "row-reverse" : "row",
            },
          ]}
        >
          <Ionicons name="call-outline" size={20} color={colors.primary} />
          <Text style={{ marginStart: spacing.sm, color: colors.primary, fontWeight: "700" }}>{t("voiceCall")}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: spacing.lg }}>{t("rideChatEmpty")}</Text>
          }
        />
      )}

      <View
        style={[
          styles.composer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            flexDirection: rtl ? "row-reverse" : "row",
            padding: spacing.sm,
            alignItems: "flex-end",
          },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={(txt) => {
            setInput(txt);
            if (!rideId) return;
            emitRideTyping(rideId, txt.trim().length > 0);
          }}
          placeholder={canSend ? t("rideChatPlaceholder") : t("rideChatClosed")}
          placeholderTextColor={colors.textMuted}
          editable={canSend && !sending}
          multiline
          maxLength={2000}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.bg,
              textAlign: rtl ? "right" : "left",
            },
          ]}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend || sending || !input.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: colors.primary, opacity: !canSend || sending || !input.trim() ? 0.45 : 1 },
          ]}
        >
          {sending ? <ActivityIndicator color={colors.primaryText} /> : <Ionicons name="send" size={20} color={colors.primaryText} />}
        </Pressable>
      </View>

      <ReportUserModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUserId={otherParty?._id}
        rideId={rideId}
        reportedName={otherName}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  bubbleRow: { marginBottom: 10, width: "100%" },
  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  callBar: { alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginEnd: 8 },
  sendBtn: { width: 48, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
