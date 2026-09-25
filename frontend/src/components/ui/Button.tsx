// Pill button (prototype .btn):
//   primary — mint            ghost  — mint outline
//   quiet   — surface         link   — no background, muted text
//   light   — white on dark (prototype .btn.sell, used to confirm a sale)
//   danger  — loss red (cancel a recurring buy)
import { type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { C } from "../../theme/colors";
import { FONT, em } from "../../theme/fonts";
import { hTap } from "../../lib/haptics";
import { PressScale } from "./PressScale";

export type ButtonVariant = "primary" | "ghost" | "quiet" | "link" | "light" | "danger";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const INK: Record<ButtonVariant, string> = {
  primary: C.onMint,
  ghost: C.mint,
  quiet: C.ink1,
  link: C.ink3,
  light: C.ground,
  danger: "#1A0605",
};

export function Button({ title, onPress, variant = "primary", size = "md", disabled, loading, icon, style }: Props) {
  const ink = INK[variant];
  const fontSize = size === "sm" ? 14 : 16;

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      dim={variant === "primary" || variant === "light" || variant === "danger"}
      onPress={() => {
        hTap();
        onPress?.();
      }}
      style={[s.base, { minHeight: size === "sm" ? 44 : 54 }, s[variant], disabled && { opacity: 0.4 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <>
          {icon}
          <Text
            numberOfLines={1}
            style={{ color: ink, fontFamily: FONT.sans700, fontSize, letterSpacing: em(fontSize, -0.01) }}
          >
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
  light: { backgroundColor: C.ink1 },
  danger: { backgroundColor: C.loss },
});
