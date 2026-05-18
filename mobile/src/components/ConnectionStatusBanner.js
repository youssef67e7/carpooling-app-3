import { useState, useEffect } from "react";
import { Text, View, Pressable, I18nManager, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeProvider";
import { apiBaseURL, isDevApiProxyActive } from "../api/client";
import { D } from "../animation/presets";

/** Scrollable callout for long troubleshooting copy (compact “details” expanded). */
function TroubleshootPanel({ children, footer, colors, spacing, radius, isDark, rtl }) {
  const bg = isDark ? "rgba(239,68,68,0.12)" : "#fef2f2";
  const border = isDark ? "rgba(239,68,68,0.35)" : "#fecaca";
  const align = { textAlign: rtl ? "right" : "left" };

  return (
    <Animated.View entering={FadeIn.duration(D.normal)} style={{ marginBottom: spacing.sm }}>
      <View
        style={{
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: border,
          backgroundColor: bg,
          padding: spacing.sm,
          overflow: "hidden",
        }}
      >
        <ScrollView
          style={{ maxHeight: 152 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {typeof children === "string" ? (
            <Text style={[{ color: colors.danger, fontSize: 13, lineHeight: 19 }, align]}>{children}</Text>
          ) : (
            children
          )}
        </ScrollView>
        {footer}
      </View>
    </Animated.View>
  );
}

/**
 * Verifies app → API → MongoDB via GET /health.
 * @param {{ compact?: boolean }} props — compact shows short API/db messages + expandable troubleshooting.
 */
export default function ConnectionStatusBanner({ compact = false }) {
  const { t } = useTranslation();
  const { colors, spacing, radius, isDark } = useTheme();
  const rtl = I18nManager.isRTL;
  const [stackHealth, setStackHealth] = useState("loading");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [stackHealth]);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);
    (async () => {
      try {
        const r = await fetch(`${apiBaseURL}/health`, { method: "GET", signal: ac.signal });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setStackHealth("api");
          return;
        }
        if (j.database === true) setStackHealth("ok");
        else if (j.ok && j.database === false) setStackHealth("db");
        else if (j.ok) setStackHealth("ok");
        else setStackHealth("api");
      } catch {
        if (!cancelled) setStackHealth("api");
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [apiBaseURL]);

  const align = { textAlign: rtl ? "right" : "left", marginBottom: spacing.xs, fontSize: compact ? 13 : 12 };
  const hideFooter = (
    <Pressable onPress={() => setExpanded(false)} accessibilityRole="button" style={{ marginTop: spacing.sm }}>
      <Text style={{ color: colors.primary, fontSize: 13, textAlign: rtl ? "right" : "left" }}>{t("connectionHideDetails")}</Text>
    </Pressable>
  );

  if (stackHealth === "loading") {
    return <Text style={[{ color: colors.textMuted }, align]}>{t("connectionChecking")}</Text>;
  }
  if (stackHealth === "ok") {
    return (
      <Text style={[{ color: colors.success, fontWeight: "600", marginBottom: spacing.sm }, align]}>
        {compact ? t("connectionStackOkShort") : t("connectionStackOk")}
      </Text>
    );
  }

  if (stackHealth === "db") {
    if (compact && !expanded) {
      return (
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[{ color: colors.danger }, align]}>{t("connectionDbDownShort")}</Text>
          <Pressable onPress={() => setExpanded(true)} accessibilityRole="button">
            <Text style={{ color: colors.primary, fontSize: 13, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
              {t("connectionShowDetails")}
            </Text>
          </Pressable>
        </View>
      );
    }
    if (compact && expanded) {
      return (
        <TroubleshootPanel
          colors={colors}
          spacing={spacing}
          radius={radius}
          isDark={isDark}
          rtl={rtl}
          footer={hideFooter}
        >
          {t("connectionDbDown")}
        </TroubleshootPanel>
      );
    }
    return (
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={[{ color: colors.danger }, align]}>{t("connectionDbDown")}</Text>
      </View>
    );
  }

  /* API unreachable */
  if (compact && !expanded) {
    return (
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={[{ color: colors.danger }, align]}>{t("connectionApiDownShort")}</Text>
        <Pressable onPress={() => setExpanded(true)} accessibilityRole="button">
          <Text style={{ color: colors.primary, fontSize: 13, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
            {t("connectionShowDetails")}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (compact && expanded) {
    return (
      <TroubleshootPanel colors={colors} spacing={spacing} radius={radius} isDark={isDark} rtl={rtl} footer={hideFooter}>
        <Text style={[{ color: colors.danger, fontSize: 13, lineHeight: 19 }, align]}>
          {t("connectionApiDown", { url: apiBaseURL })}
        </Text>
        {isDevApiProxyActive() ? (
          <Text style={[{ color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: spacing.sm }, align]}>
            {t("connectionApiProxyHint")}
          </Text>
        ) : null}
      </TroubleshootPanel>
    );
  }

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={[{ color: colors.danger }, align]}>{t("connectionApiDown", { url: apiBaseURL })}</Text>
      {isDevApiProxyActive() ? (
        <Text style={[{ color: colors.danger }, align, { marginTop: 4, fontSize: 11 }]}>
          {t("connectionApiProxyHint")}
        </Text>
      ) : null}
    </View>
  );
}
