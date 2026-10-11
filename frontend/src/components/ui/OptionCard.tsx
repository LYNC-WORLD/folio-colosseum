// Selectable card used by onboarding answers and settings choices.
// Selected: mint ring around the card, dot fills to a mint centre.
import { useEffect, type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { C } from "../../theme/colors";
import { TYPE } from "../../theme/type";
import { timing } from "../../theme/motion";
import { hSelect } from "../../lib/haptics";
import { PressScale } from "./PressScale";

type Props = {
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress?: () => void;
  /** "square" for multi-select, "round" for single-select */
  shape?: "round" | "square";
  /** shown at the right edge (a note, a badge) */
  right?: ReactNode;
  /** extra content under the subtitle (e.g. a bar) */
  children?: ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  /** "row" (default) or "tile": dot on top, text at the bottom, fixed height (prototype Q4) */
  layout?: "row" | "tile";
  style?: StyleProp<ViewStyle>;
};

export function OptionCard({
  title,
  subtitle,
  selected = false,
  onPress,
  shape = "round",
  right,
  children,
  titleStyle,
  layout = "row",
  style,
}: Props) {
  const p = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(selected ? 1 : 0, timing(200));
  }, [selected]);

  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.value, [0, 1], ["rgba(55,224,153,0)", C.mint]),
  }));
  const dotOuter = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.value, [0, 1], [C.dotRing, C.ground]),
    backgroundColor: interpolateColor(p.value, [0, 1], ["rgba(10,11,14,0)", C.ground]),
  }));
  const dotInner = useAnimatedStyle(() => ({ transform: [{ scale: p.value }], opacity: p.value }));
  const r = shape === "square" ? 7 : 11;

  return (
    <PressScale
      accessibilityRole={shape === "square" ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      scaleTo={0.985}
      onPress={() => {
        hSelect();
        onPress?.();
      }}
      style={style}
    >
      <Animated.View style={[s.card, layout === "tile" && s.tile, ring]}>
        <Animated.View style={[s.dot, { borderRadius: r }, dotOuter]}>
          <Animated.View style={[s.dotInner, { borderRadius: shape === "square" ? 2.5 : 6 }, dotInner]} />
        </Animated.View>
        <View style={layout === "tile" ? s.tileText : s.text}>
          <Text style={[TYPE.ttl, titleStyle]}>{title}</Text>
          {subtitle ? <Text style={TYPE.sub}>{subtitle}</Text> : null}
          {children}
        </View>
        {right}
      </Animated.View>
    </PressScale>
  );
}

const s = StyleSheet.create({
  card: {
    minHeight: 60,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  text: { flex: 1, gap: 3, paddingVertical: 12 },
  tile: {
    height: 112,
    padding: 16,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 0,
  },
  tileText: { gap: 3 },
  dot: { width: 22, height: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  dotInner: { width: 12, height: 12, backgroundColor: C.mint },
});
