import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { D } from "../../animation/presets";

const AnimatedView = Animated.View;

/**
 * Nearby-driver pin with spring scale when selected (tracksViewChanges off after mount for perf).
 */
export default function DriverMapMarker({
  coordinate,
  selected,
  pinColor,
  title,
  identifier,
  onPress,
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.22 : 1, D.spring);
  }, [selected, scale]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Marker
      identifier={identifier}
      coordinate={coordinate}
      title={title}
      onPress={onPress}
      tracksViewChanges={!!selected}
    >
      <AnimatedView style={[styles.dotOuter, { borderColor: pinColor }, ring]}>
        <View style={[styles.dotInner, { backgroundColor: pinColor }]} />
      </AnimatedView>
    </Marker>
  );
}

const styles = StyleSheet.create({
  dotOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  dotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
