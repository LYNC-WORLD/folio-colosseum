// Placeholder block that breathes while data loads.
import { useEffect } from "react";
import { type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { C } from "../../theme/colors";

type Props = { width?: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle> };

export function Skeleton({ width = "100%", height, radius = 8, style }: Props) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 0.5 : 0);
  useEffect(() => {
    if (reduced) return;
    p.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduced]);
  const a = useAnimatedStyle(() => ({ opacity: 0.45 + 0.4 * p.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: C.raised }, a, style]} />;
}
