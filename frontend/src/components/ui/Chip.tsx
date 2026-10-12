import { useEffect, type ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { C } from "../../theme/colors";
import { FONT, em } from "../../theme/fonts";
import { timing } from "../../theme/motion";
import { hSelect } from "../../lib/haptics";
import { PressScale } from "./PressScale";

type Props = {
  label: string;
  on?: boolean;
  onPress?: () => void;
  variant?: "default" | "mint" | "outline";
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  on = false,
  onPress,
  variant = "default",
  icon,
  style,
}: Props) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(on ? 1 : 0, timing(180));
  }, [on]);

  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [C.surface, C.mint]),
  }));
  const ink = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [C.ink2, C.onMint]),
  }));

  if (variant === "mint") {
    return (
      <Animated.View style={[s.chip, s.mint, style]}>
        {icon}
        <Animated.Text style={s.mintText}>{label}</Animated.Text>
      </Animated.View>
    );
  }

  if (variant === "outline") {
    return (
      <PressScale
        accessibilityRole="button"
        hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
        scaleTo={0.96}
        onPress={() => {
          hSelect();
          onPress?.();
        }}
        style={[s.chip, s.outline, style]}
      >
        {icon}
        <Animated.Text style={[s.text, s.outlineText]} numberOfLines={1}>
          {label}
        </Animated.Text>
      </PressScale>
    );
  }

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
      scaleTo={0.96}
      onPress={() => {
        hSelect();
        onPress?.();
      }}
      style={[s.chip, style]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: 999 }, bg]}
      />
      {icon}
      <Animated.Text
        style={[s.text, { fontFamily: on ? FONT.sans700 : FONT.sans600 }, ink]}
      >
        {label}
      </Animated.Text>
    </PressScale>
  );
}

const s = StyleSheet.create({
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12.5 },
  mint: {
    backgroundColor: C.mintWash,
    borderWidth: 1,
    borderColor: C.mintEdge,
  },
  mintText: {
    color: C.mint,
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.1),
  },
  outline: { borderWidth: 1.5, borderColor: "rgba(55,224,153,0.5)" },
  outlineText: { color: C.mint, fontFamily: FONT.sans600 },
});
