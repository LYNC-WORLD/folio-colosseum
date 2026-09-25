// Tiny mono tag: "PRE-IPO", "#1 THIS QUARTER".
import { StyleSheet, Text, View } from "react-native";
import { C } from "../../theme/colors";
import { FONT, em } from "../../theme/fonts";

export function Badge({ label, variant = "default" }: { label: string; variant?: "default" | "mint" | "solid" }) {
  return (
    <View
      style={[
        s.box,
        variant === "mint" && { borderColor: "rgba(55,224,153,0.4)" },
        variant === "solid" && { backgroundColor: C.mint, borderColor: "transparent" },
      ]}
    >
      <Text
        style={[
          s.text,
          variant === "mint" && { color: C.mint },
          variant === "solid" && { color: C.onMint },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderColor: C.stroke, borderRadius: 5, paddingVertical: 4, paddingHorizontal: 6, alignSelf: "flex-start" },
  text: { fontFamily: FONT.mono400, fontSize: 8.5, letterSpacing: em(8.5, 0.13), color: C.ink3 },
});
