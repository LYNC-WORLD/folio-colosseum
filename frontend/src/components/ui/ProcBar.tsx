// Indeterminate progress (prototype .proc): a mint bar sliding across a track.
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { C } from "../../theme/colors";

export function ProcBar() {
  const w = useSharedValue(0);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, []);
  const bar = useAnimatedStyle(() => {
    const bw = w.value * 0.4;
    return { width: bw, transform: [{ translateX: -1.1 * bw + p.value * 4.3 * bw }] };
  });
  return (
    <View
      onLayout={(e) => (w.value = e.nativeEvent.layout.width)}
      style={{ alignSelf: "stretch", height: 4, borderRadius: 999, backgroundColor: C.track, overflow: "hidden" }}
      accessibilityRole="progressbar"
    >
      <Animated.View style={[{ height: "100%", borderRadius: 999, backgroundColor: C.mint }, bar]} />
    </View>
  );
}
