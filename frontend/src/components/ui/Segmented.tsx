// Segmented control with a sliding mint thumb (Buy / Recurring, One-time / Recurring).
// Label colours follow the thumb as it moves.
import { useEffect } from "react";
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
import { C } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { DUR, timing } from "../../theme/motion";
import { hSelect } from "../../lib/haptics";

type Props = {
  options: string[];
  index: number;
  onChange: (i: number) => void;
  style?: StyleProp<ViewStyle>;
};

export function Segmented({ options, index, onChange, style }: Props) {
  const pos = useSharedValue(index);
  const width = useSharedValue(0);
  const n = options.length;

  useEffect(() => {
    pos.value = withTiming(index, timing(DUR.segment));
  }, [index]);

  const thumb = useAnimatedStyle(() => {
    const w = (width.value - 8) / n;
    return {
      width: Math.max(0, w),
      transform: [{ translateX: pos.value * w }],
    };
  });

  return (
    <View
      style={[s.wrap, style]}
      onLayout={(e) => (width.value = e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      <Animated.View style={[s.thumb, thumb]} />
      {options.map((label, i) => (
        <Pressable
          key={label}
          style={s.btn}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === index }}
          onPress={() => {
            if (i !== index) hSelect();
            onChange(i);
          }}
        >
          <SegLabel label={label} i={i} pos={pos} />
        </Pressable>
      ))}
    </View>
  );
}

function SegLabel({
  label,
  i,
  pos,
}: {
  label: string;
  i: number;
  pos: SharedValue<number>;
}) {
  const a = useAnimatedStyle(() => {
    const near = 1 - Math.min(1, Math.abs(pos.value - i));
    return { color: interpolateColor(near, [0, 1], [C.ink3, C.mint]) };
  });
  return (
    <Animated.Text numberOfLines={1} style={[s.label, a]}>
      {label}
    </Animated.Text>
  );
}

const s = StyleSheet.create({
  wrap: {
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
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: C.mint,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  label: { fontFamily: FONT.sans700, fontSize: 14 },
});
