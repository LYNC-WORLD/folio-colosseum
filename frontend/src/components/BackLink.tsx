// Mint "‹ Label" link used at the top of pushed screens (prototype .back).
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, FONT } from "../theme";

export function BackLink({ label = "Back", onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="chevron-back" size={16} color={C.mint} />
      <Text style={s.text}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", minHeight: 44, marginLeft: -4, marginVertical: -8 },
  text: { fontFamily: FONT.sans600, fontSize: 13, color: C.mint },
});
