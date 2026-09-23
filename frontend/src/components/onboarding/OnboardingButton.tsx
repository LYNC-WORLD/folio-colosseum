import { Pressable, StyleSheet, Text } from "react-native";
import { C, FONT, RADIUS } from "../../theme";

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        s.primary,
        pressed && s.pressed,
        disabled && s.disabled,
      ]}
    >
      <Text style={s.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function GhostLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.ghost, pressed && { opacity: 0.6 }]}
    >
      <Text style={s.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  primary: {
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: C.bone,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontFamily: FONT.display700,
    fontSize: 15,
    letterSpacing: -0.15,
    color: C.buttonInk,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },

  ghost: {
    height: 44,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostLabel: {
    fontFamily: FONT.display400,
    fontSize: 14,
    color: C.inkMuted,
  },
});
