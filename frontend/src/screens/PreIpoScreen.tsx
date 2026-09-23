import { SafeAreaView, StyleSheet, Text } from "react-native";
import { C } from "../theme";

export function PreIpoScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.text}>Pre-IPO — coming soon</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { color: C.muted, fontSize: 16 },
});
