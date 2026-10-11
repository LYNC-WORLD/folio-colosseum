// 46×27 toggle. Track fades to mint, knob slides 19pt.
import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { C } from "../../theme/colors";
import { DUR, timing } from "../../theme/motion";
import { hSelect } from "../../lib/haptics";

type Props = { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel?: string };

export function Switch({ value, onValueChange, accessibilityLabel }: Props) {
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(value ? 1 : 0, timing(DUR.switch));
  }, [value]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [C.stroke, C.mint]),
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 19 }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={{ top: 9, bottom: 9, left: 4, right: 4 }}
      onPress={() => {
        hSelect();
        onValueChange(!value);
      }}
    >
      <Animated.View style={[s.track, track]}>
        <Animated.View style={[s.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  track: { width: 46, height: 27, borderRadius: 999 },
  knob: { position: "absolute", top: 3, left: 3, width: 21, height: 21, borderRadius: 999, backgroundColor: C.ground },
});
