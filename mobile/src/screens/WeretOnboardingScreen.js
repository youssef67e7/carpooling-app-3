import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
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
import WeretWordmarkOnLight from "../components/auth/WeretWordmarkOnLight";
import { weretPalette as P, weretElevation, weretPress, weretRadius } from "../theme/weretDesignSystem";
import { weretEnter } from "../theme/weretMotion";

const WERET_ONBOARDING_DONE_KEY = "@weret_onboarding_done_v1";

const HERO_TOPDOWN = require("../assets/weret/onboarding/weret-onboard-1-topdown.png");
const SUV = require("../assets/weret/onboarding/weret-onboard-2-suv.png");

const SLIDE_COUNT = 2;

function SlideHero({ width, height, t }) {
  const rtl = I18nManager.isRTL;
  const titleSize = Math.min(40, Math.round(width * 0.1));
  const indent = rtl ? { paddingRight: width * 0.1 } : { paddingLeft: width * 0.12 };

  return (
    <View style={[styles.slideBox, { width, height }]}>
      <View style={[styles.heroTop, { paddingTop: height * 0.05 }]}>
        <View style={styles.centerMark}>
          <WeretWordmarkOnLight label={t("appName")} fontSize={titleSize} />
        </View>
        <View style={[{ marginTop: 18, alignSelf: "stretch" }, indent]}>
          <WeretWordmarkOnLight label={t("weretOnboardHeroPremium")} fontSize={15} compact disableUppercase />
          <View style={{ height: 8 }} />
          <WeretWordmarkOnLight label={t("weretOnboardHeroCars")} fontSize={15} compact disableUppercase />
        </View>
      </View>
      <View style={[styles.heroCarWrap, { width: width * 0.92, height: height * 0.36 }]}>
        <Image source={HERO_TOPDOWN} style={styles.heroCarImg} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    </View>
  );
}

function SlideStory({ width, height, t }) {
  const rtl = I18nManager.isRTL;
  const pull = rtl ? { marginRight: -width * 0.05 } : { marginLeft: -width * 0.06 };

  return (
    <View style={[styles.slideBox, { width, height }]}>
      <View style={{ paddingTop: height * 0.045, alignItems: "center" }}>
        <WeretWordmarkOnLight label={t("appName")} fontSize={Math.min(32, width * 0.085)} />
      </View>
      <View style={[styles.storyRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <Image source={SUV} style={[styles.storyImg, { width: width * 0.52, height: height * 0.34 }, pull]} resizeMode="cover" />
        <View style={styles.storyCopy}>
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
  const scrollRef = useRef(null);
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
      const next = page + 1;
      scrollRef.current?.scrollTo({ x: width * next, animated: true });
      setPage(next);
    } else {
      finish();
    }
  }, [page, width, finish]);

  const onScrollEnd = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / Math.max(width, 1));
      setPage(Math.min(Math.max(i, 0), SLIDE_COUNT - 1));
    },
    [width],
  );

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
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={onScrollEnd}
          scrollEventThrottle={16}
        >
          <SlideHero width={width} height={height} t={t} />
          <SlideStory width={width} height={height} t={t} />
        </ScrollView>
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
  heroTop: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerMark: {
    alignItems: "center",
  },
  heroCarWrap: {
    alignSelf: "center",
    marginBottom: 28,
    ...weretElevation.heroFloat,
  },
  heroCarImg: {
    width: "100%",
    height: "100%",
  },
  storyRow: {
    flex: 1,
    marginTop: 12,
    paddingHorizontal: 8,
    alignItems: "flex-start",
  },
  storyImg: {
    borderRadius: 0,
  },
  storyCopy: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
    justifyContent: "flex-start",
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
});
