// Anything tappable that should squash slightly on press (the prototype's :active scale).
import { type ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DUR, timing } from "../../theme/motion";

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** scale at full press; the prototype's buttons use .972 */
  scaleTo?: number;
  /** darken while pressed (stands in for CSS brightness(.94)) */
  dim?: boolean;
};

export function PressScale({ style, children, scaleTo = 0.972, dim = false, onPressIn, onPressOut, ...rest }: Props) {
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 1 - (1 - scaleTo) * p.value }] }));
  const shade = useAnimatedStyle(() => ({ opacity: p.value * 0.06 }));

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        p.value = withTiming(1, timing(DUR.press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.value = withTiming(0, timing(DUR.press));
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, a]}>
        {children}
        {dim && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: "#000", borderRadius: 999 }, shade]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}
