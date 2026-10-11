// Three dots blinking in turn (prototype .dots: 1.1s, 160ms apart).
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { C } from "../theme";

function Dot({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(reduced ? 0.7 : 0.3);
  useEffect(() => {
    if (reduced) return;
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 330 }),
          withTiming(0.3, { duration: 330 }),
          withTiming(0.3, { duration: 440 }),
        ),
        -1,
      ),
    );
  }, [reduced]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 999, backgroundColor: C.ink4 },
        a,
      ]}
    />
  );
}

export function TypingDots() {
  return (
    <View
      style={{ flexDirection: "row", gap: 4, alignItems: "center", height: 20 }}
      accessibilityLabel="Analyst is typing"
    >
      <Dot delay={0} />
      <Dot delay={160} />
      <Dot delay={320} />
    </View>
  );
}
