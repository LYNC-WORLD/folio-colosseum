// Two-way segmented switch — prototype .seg
//
//   ( [ Leaderboard ]   Groups      )   ← raised thumb slides 340ms, label turns mint
//
// Pill track on surface, thumb on raised with a 1pt #313844 ring.

import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { C, FONT } from "../theme";
import { timing } from "../theme/motion";
import { hSelect } from "../lib/haptics";

type Props<K extends string> = {
  options: readonly [K, string][]; // [key, label]
  value: K;
  onChange: (k: K) => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
  style,
}: Props<K>) {
  const index = Math.max(
    0,
    options.findIndex(([k]) => k === value),
  );
  const p = useSharedValue(index);
  const [w, setW] = useState(0);

  useEffect(() => {
    p.value = withTiming(index, timing(340));
  }, [index]);

  const seg = w > 0 ? (w - 8) / options.length : 0;
  const thumb = useAnimatedStyle(() => ({
    width: seg,
    transform: [{ translateX: p.value * seg }],
  }));

  return (
    <View
      style={[s.track, style]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      accessibilityLabel={label}
    >
      {w > 0 ? <Animated.View style={[s.thumb, thumb]} /> : null}
      {options.map(([k, text], i) => (
        <Pressable
          key={k}
          style={s.btn}
          onPress={() => {
            if (k === value) return;
            hSelect();
            onChange(k);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: k === value }}
        >
          <SegLabel text={text} i={i} p={p} />
        </Pressable>
      ))}
    </View>
  );
}

function SegLabel({
  text,
  i,
  p,
}: {
  text: string;
  i: number;
  p: SharedValue<number>;
}) {
  const a = useAnimatedStyle(() => {
    const on = Math.max(0, 1 - Math.abs(p.value - i));
    return { color: interpolateColor(on, [0, 1], [C.ink3, C.mint]) };
  });
  return (
    <Animated.Text style={[s.text, a]} numberOfLines={1}>
      {text}
    </Animated.Text>
  );
}

const s = StyleSheet.create({
  track: {
    height: 46,
    padding: 4,
    borderRadius: 999,
    backgroundColor: C.surface,
    flexDirection: "row",
  },
  thumb: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: "#313844",
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  text: { fontFamily: FONT.sans700, fontSize: 14 },
});
