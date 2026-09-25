// Round 44pt icon button (prototype .iconBtn) — gear, share, history.
import { type ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DUR, timing } from "../../theme/motion";
import { hTap } from "../../lib/haptics";

type Props = { label: string; onPress?: () => void; children: ReactNode };

export function IconButton({ label, onPress, children }: Props) {
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.08 * p.value }],
    backgroundColor: interpolateColor(p.value, [0, 1], ["rgba(10,11,14,0.55)", "#1F242D"]),
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => (p.value = withTiming(1, timing(DUR.press)))}
      onPressOut={() => (p.value = withTiming(0, timing(DUR.press)))}
      onPress={() => {
        hTap();
        onPress?.();
      }}
    >
      <Animated.View style={[s.btn, a]}>{children}</Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2A303A",
  },
});
