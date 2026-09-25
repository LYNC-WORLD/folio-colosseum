// Entrance animations from the prototype:
//   <Rise>  fade + rise 14pt     (@keyframes rise)
//   <Pop>   fade + scale from .6 (@keyframes pop)
// Use `delay={stagger(i)}` to cascade a list.
// `when={false}` holds the element hidden until it becomes true
// (e.g. wait for the splash to finish before Home animates in).
import { useEffect, type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { DUR, timing } from "../../theme/motion";

type Props = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  when?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Rise({
  children,
  delay = 0,
  duration = DUR.rise,
  distance = 14,
  when = true,
  style,
}: Props & { distance?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (when) p.value = withDelay(delay, withTiming(1, timing(duration)));
  }, [when]);
  const a = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * distance }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

export function Pop({ children, delay = 0, duration = 220, when = true, style }: Props) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (when) p.value = withDelay(delay, withTiming(1, timing(duration)));
  }, [when]);
  const a = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.6 + 0.4 * p.value }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}
