// Pill button: primary (mint), ghost (mint outline), quiet (surface),
// link (no background, muted text — "Retake the questions").
import { type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { C } from "../../theme/colors";
import { FONT, em } from "../../theme/fonts";
import { hTap } from "../../lib/haptics";
import { PressScale } from "./PressScale";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "ghost" | "quiet" | "link";
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = "primary", size = "md", disabled, loading, icon, style }: Props) {
  const ink =
    variant === "primary" ? C.onMint : variant === "ghost" ? C.mint : variant === "link" ? C.ink3 : C.ink1;
  const fontSize = size === "sm" ? 14 : 16;

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      dim={variant === "primary"}
      onPress={() => {
        hTap();
        onPress?.();
      }}
      style={[
        s.base,
        { minHeight: size === "sm" ? 44 : 54 },
        variant === "primary" && s.primary,
        variant === "ghost" && s.ghost,
        variant === "quiet" && s.quiet,
        variant === "link" && s.link,
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <>
          {icon}
          <Text style={{ color: ink, fontFamily: FONT.sans700, fontSize, letterSpacing: em(fontSize, -0.01) }}>
            {title}
          </Text>
        </>
      )}
    </PressScale>
  );
}

const s = StyleSheet.create({
  base: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 999,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  primary: { backgroundColor: C.mint },
  ghost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: C.mint },
  quiet: { backgroundColor: C.surface },
  link: { backgroundColor: "transparent" },
});
