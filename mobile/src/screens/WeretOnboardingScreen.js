import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  I18nManager,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated from "react-native-reanimated";
import WeretOutlineWordmark from "../components/auth/WeretOutlineWordmark";
import { weretPalette as P, weretElevation, weretPress, weretRadius } from "../theme/weretDesignSystem";
import { weretEnter } from "../theme/weretMotion";

const WERET_ONBOARDING_DONE_KEY = "@weret_onboarding_done_v1";

const HERO_TOPDOWN = require("../assets/weret/onboarding/weret-onboard-1-topdown.png");
const SUV = require("../assets/weret/onboarding/weret-onboard-2-suv.png");

const SLIDE_COUNT = 2;

function TawsilaWordmark({ width }) {
  // Match icon typography: bold, spaced, subtle outline/shadow.
  const fontSize = Math.min(46, Math.round(width * 0.12));
  return (
    <Text
      style={{
        fontSize,
        fontWeight: "900",
        letterSpacing: 2.6,
        color: P.ink,
        textTransform: "uppercase",
        textShadowColor: "rgba(0,0,0,0.28)",
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 3,
      }}
    >
      TAWSILA
    </Text>
  );
}

function SlideHero({ width, height, t }) {
  const rtl = I18nManager.isRTL;
  const indent = rtl ? { paddingRight: width * 0.08 } : { paddingLeft: width * 0.08 };

  return (
    <View style={[styles.slideBox, { width, height }]}>
      <Image
        source={HERO_TOPDOWN}
        style={[StyleSheet.absoluteFill, { width, height }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <View style={[styles.heroOverlay, { paddingTop: height * 0.06, paddingBottom: height * 0.06 }]}>
        <View style={[styles.centerMark, indent]}>
          <TawsilaWordmark width={width} />
        </View>

        <View style={[styles.heroTagline, { alignSelf: "stretch" }, indent]}>
          <Text style={{ color: P.muted, fontWeight: "800", letterSpacing: 1.2 }}>
            {t("weretOnboardHeroPremium")}
          </Text>
          <View style={{ height: 6 }} />
          <Text style={{ color: P.muted, fontWeight: "800", letterSpacing: 1.2 }}>
            {t("weretOnboardHeroCars")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SlideStory({ width, height, t }) {
  const rtl = I18nManager.isRTL;

  return (
    <View style={[styles.slideBox, { width, height }]}>
      <Image source={SUV} style={[StyleSheet.absoluteFill, { width, height }]} resizeMode="cover" accessibilityIgnoresInvertColors />

      <View style={[styles.storyOverlay, { paddingTop: height * 0.06, paddingBottom: height * 0.06 }]}>
        <View style={{ alignItems: rtl ? "flex-end" : "flex-start" }}>
          <TawsilaWordmark width={width} />
        </View>

        <View style={[styles.storyCard, { flexDirection: "column" }]}>
          <Text style={[styles.storyTitle, { textAlign: rtl ? "right" : "left" }]}>{t("weretOnboardStoryTitle")}</Text>
          <Text style={[styles.storyBody, { textAlign: rtl ? "right" : "left" }]}>{t("weretOnboardStoryBody")}</Text>
        </View>
      </View>
    </View>
  );
}

export default function WeretOnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(WERET_ONBOARDING_DONE_KEY);
        if (!alive) return;
        if (v === "1") {
          navigation.replace("Login");
          return;
        }
      } catch {
        // ignore
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigation]);

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(WERET_ONBOARDING_DONE_KEY, "1");
    } catch {
      // ignore
    }
    navigation.replace("Login");
  }, [navigation]);

  const goNext = useCallback(() => {
    if (page < SLIDE_COUNT - 1) {
      setPage((p) => Math.min(p + 1, SLIDE_COUNT - 1));
    } else {
      finish();
    }
  }, [page, finish]);

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  if (!hydrated) {
    return (
      <View style={styles.hold}>
        <Animated.View entering={weretEnter.fade} style={styles.holdInner}>
          <WeretOutlineWordmark label={t("appName")} />
        </Animated.View>
      </View>
    );
  }

  const rtl = I18nManager.isRTL;

  return (
    <View style={styles.root}>
      <Animated.View entering={weretEnter.screen} style={styles.ltrScrollHost}>
        {page === 0 ? <SlideHero width={width} height={height} t={t} /> : <SlideStory width={width} height={height} t={t} />}
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("weretOnboardingSkip")}
        onPress={finish}
        style={({ pressed }) => [
          styles.skip,
          {
            top: insets.top + 10,
            ...(rtl ? { left: 18 } : { right: 18 }),
            opacity: pressed ? weretPress.opacity : 1,
          },
        ]}
        hitSlop={12}
      >
        <MaterialCommunityIcons name="close" size={22} color={P.ink} />
      </Pressable>

      <View
        style={[
          styles.dots,
          {
            bottom: insets.bottom + 100,
            flexDirection: rtl ? "row-reverse" : "row",
          },
        ]}
        pointerEvents="none"
      >
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <View key={i} style={[styles.dot, i === page ? styles.dotOn : styles.dotOff]} />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("weretOnboardingNext")}
        onPress={goNext}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: insets.bottom + 28,
            ...(rtl ? { left: 24 } : { right: 24 }),
            opacity: pressed ? weretPress.opacity : 1,
          },
        ]}
      >
        <MaterialCommunityIcons name={rtl ? "chevron-left" : "chevron-right"} size={28} color={P.onPrimary} />
      </Pressable>

      {page > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={goPrev}
          style={({ pressed }) => [
            styles.backFab,
            {
              bottom: insets.bottom + 28,
              ...(rtl ? { right: 24 } : { left: 24 }),
              opacity: pressed ? weretPress.opacity : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name={rtl ? "chevron-right" : "chevron-left"} size={28} color={P.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: P.surface,
  },
  ltrScrollHost: {
    flex: 1,
  },
  hold: {
    flex: 1,
    backgroundColor: P.splash,
    alignItems: "center",
    justifyContent: "center",
  },
  holdInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  slideBox: {
    backgroundColor: P.surface,
  },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  centerMark: {
    alignItems: "flex-start",
  },
  heroTagline: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  storyOverlay: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  storyCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  storyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: P.ink,
    letterSpacing: 0.2,
    lineHeight: 28,
  },
  storyBody: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
    color: P.muted,
    lineHeight: 20,
  },
  skip: {
    position: "absolute",
    zIndex: 2,
    padding: 8,
    borderRadius: weretRadius.pill,
    backgroundColor: P.overlayLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.border,
  },
  dots: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 1,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: weretRadius.dot,
  },
  dotOn: {
    backgroundColor: P.ink,
  },
  dotOff: {
    backgroundColor: P.mutedLight,
  },
  fab: {
    position: "absolute",
    zIndex: 2,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: P.ink,
    alignItems: "center",
    justifyContent: "center",
    ...weretElevation.fab,
  },
  backFab: {
    position: "absolute",
    zIndex: 2,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: P.overlayLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.border,
    alignItems: "center",
    justifyContent: "center",
    ...weretElevation.fab,
  },
});
