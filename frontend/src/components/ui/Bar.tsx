// Progress bar that grows to its value (800ms), e.g. onboarding result and "5 of 8 in".
import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { C } from "../../theme/colors";
import { DUR, timing } from "../../theme/motion";

type Props = { value: number; height?: number; color?: string; delay?: number; style?: StyleProp<ViewStyle> };

export function Bar({ value, height = 8, color = C.mint, delay = 0, style }: Props) {
  const w = useSharedValue(0);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(Math.max(0, Math.min(1, value)), timing(DUR.bar)));
  }, [value]);
  const fill = useAnimatedStyle(() => ({ width: w.value * p.value }));

  return (
    <View
      onLayout={(e) => (w.value = e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: height / 2, backgroundColor: C.track, overflow: "hidden" }, style]}
    >
      <Animated.View style={[{ height: "100%", borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}
